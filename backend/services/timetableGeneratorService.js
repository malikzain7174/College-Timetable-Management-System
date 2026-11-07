const { createHash } = require("node:crypto");
const { HttpError } = require("../lib/httpError");
const timetableRuleService = require("./timetableRuleService");
const { getSchedulingData, listEntries } = require("./timetableData");
const { clearEntries, insertEntries, withTimetableLock } = require("./timetableEntryService");
const {
    activeAssignments, assignmentProblem, evaluateSchedule, overlapping, passesConfigurableRules,
    placedPeriods, requiresLab
} = require("./schedulingConstraints");

const hasSectionConflict = (entries, sectionId, timeSlotId) => {

    return entries.some(entry =>

        Number(entry.SectionId) === Number(sectionId) &&

        Number(entry.TimeSlotId) === Number(timeSlotId)

    );

};



const hasTeacherConflict = (entries, teacherId, timeSlotId) => {

    return entries.some(entry =>

        Number(entry.TeacherId) === Number(teacherId) &&

        Number(entry.TimeSlotId) === Number(timeSlotId)

    );

};



const hasRoomConflict = (entries, roomId, timeSlotId) => {

    return entries.some(entry =>

        Number(entry.RoomId) === Number(roomId) &&

        Number(entry.TimeSlotId) === Number(timeSlotId)

    );

};



const isBiologySubject = row => {

    const code = String(row.SubjectCode || "").trim().toUpperCase();

    const name = String(row.SubjectName || "").trim().toLowerCase();



    return code === "BIO101" || name.includes("biology");

};



const isMathematicsSubject = row => {

    const code = String(row.SubjectCode || "").trim().toUpperCase();

    const name = String(row.SubjectName || "").trim().toLowerCase();



    return (

        code === "MAT101" ||

        name.includes("mathematics") ||

        name === "math" ||

        name === "maths"

    );

};



const isPreMedicalSection = row => {

    const text = `${row.SectionCode || ""} ${row.SectionName || ""}`

        .toUpperCase();



    return (

        text.includes("-PM-") ||

        text.includes("PRE-MED") ||

        text.includes("PRE MED")

    );

};



const isPreEngineeringSection = row => {

    const text = `${row.SectionCode || ""} ${row.SectionName || ""}`

        .toUpperCase();



    return (

        text.includes("-PE-") ||

        text.includes("PRE-ENG") ||

        text.includes("PRE ENG")

    );

};



// ======================================================

// DISTINCT TASK ROWS

// ======================================================



const getDistinctTaskRows = task => {

    return [

        ...new Map(

            task.rows.map(row => [Number(row.SectionId), row])

        ).values()

    ];

};



// ======================================================

// TASK CAPACITY

// ======================================================



const getTaskCapacity = task => {

    const distinctRows = getDistinctTaskRows(task);



    if (task.type === "Common") {

        return distinctRows.reduce(

            (total, row) => total + Number(row.StudentCount || 0),

            0

        );

    }



    return Number(distinctRows[0]?.StudentCount || 0);

};




// ======================================================
// CONFIGURABLE RULE ENGINE HELPERS
// ======================================================

const buildTasks = (subjects, rules = []) => {

    const tasks = [];

    const consumed = new Set();

    const remainingHours = new Map();


    const bioMathEnabled = Boolean(
        timetableRuleService.getBestRule(
            rules,
            "BIO_MATH_PARALLEL",
            {}
        )
    );


    for (const row of subjects) {

        remainingHours.set(

            Number(row.SectionSubjectId),

            Number(row.WeeklyHours) || 0

        );

    }



        if (bioMathEnabled) {

    // --------------------------------------------------

        // PARALLEL BIOLOGY + MATHEMATICS

        // --------------------------------------------------



        const academicGroups = new Map();



        for (const row of subjects) {

            const key = `${Number(row.CampusId)}|${Number(row.ClassYearId)}`;



            if (!academicGroups.has(key)) {

                academicGroups.set(key, []);

            }



            academicGroups.get(key).push(row);

        }



        for (const rows of academicGroups.values()) {

            const biologyRow = rows.find(row =>

                isPreMedicalSection(row) &&

                isBiologySubject(row)

            );



            const mathematicsRow = rows.find(row =>

                isPreEngineeringSection(row) &&

                isMathematicsSubject(row)

            );



            if (!biologyRow || !mathematicsRow) {

                continue;

            }



            const biologyHours = Number(

                remainingHours.get(Number(biologyRow.SectionSubjectId))

            ) || 0;



            const mathematicsHours = Number(

                remainingHours.get(Number(mathematicsRow.SectionSubjectId))

            ) || 0;



            const pairedHours = Math.min(

                biologyHours,

                mathematicsHours

            );



            if (pairedHours <= 0) {

                continue;

            }



            tasks.push({

                type: "ParallelBioMath",



                teachingGroupId:

                    biologyRow.TeachingGroupId ||

                    mathematicsRow.TeachingGroupId ||

                    null,



                subjectId: null,



                rows: [

                    biologyRow,

                    mathematicsRow

                ],



                biologyRow,

                mathematicsRow,



                requiredHours:

                    pairedHours

            });



            remainingHours.set(

                Number(

                    biologyRow.SectionSubjectId

                ),

                biologyHours - pairedHours

            );



            remainingHours.set(

                Number(

                    mathematicsRow.SectionSubjectId

                ),

                mathematicsHours - pairedHours

            );

        }





    }

// --------------------------------------------------

    // COMMON TEACHING GROUPS

    // --------------------------------------------------



    const groups = new Map();



    for (const row of subjects) {

        if (!row.TeachingGroupId) {

            continue;

        }



        const left = Number(

            remainingHours.get(

                Number(

                    row.SectionSubjectId

                )

            )

        ) || 0;



        if (left <= 0) {

            continue;

        }



        const groupId =

            Number(

                row.TeachingGroupId

            );



        if (!groups.has(groupId)) {

            groups.set(

                groupId,

                []

            );

        }



        groups

            .get(groupId)

            .push({

                ...row,

                WeeklyHours:

                    left

            });

    }



    for (const [

        teachingGroupId,

        rows

    ] of groups) {



        const groupSectionIds = [

            ...new Set(

                rows.map(

                    row =>

                        Number(

                            row.SectionId

                        )

                )

            )

        ];



        const bySubject =

            new Map();



        for (const row of rows) {

            const subjectId =

                Number(

                    row.SubjectId

                );



            if (!bySubject.has(subjectId)) {

                bySubject.set(

                    subjectId,

                    []

                );

            }



            bySubject

                .get(subjectId)

                .push(row);

        }



        for (const [

            subjectId,

            subjectRows

        ] of bySubject) {



            const subjectSections = [

                ...new Set(

                    subjectRows.map(

                        row =>

                            Number(

                                row.SectionId

                            )

                    )

                )

            ];



            if (

                subjectSections.length !==

                groupSectionIds.length

            ) {

                continue;

            }



            if (subjectRows.length < 2) {

                continue;

            }



            const teacherIds = [

                ...new Set(

                    subjectRows.map(

                        row =>

                            Number(

                                row.TeacherId

                            )

                    )

                )

            ];



            const weeklyHours = [

                ...new Set(

                    subjectRows.map(

                        row =>

                            Number(

                                row.WeeklyHours

                            )

                    )

                )

            ];



            if (

                teacherIds.length !== 1 ||

                weeklyHours.length !== 1

            ) {

                continue;

            }



            tasks.push({

                type:

                    "Common",



                teachingGroupId,



                subjectId,



                rows:

                    subjectRows,



                teacherId:

                    teacherIds[0],



                requiredHours:

                    weeklyHours[0]

            });



            for (const row of subjectRows) {

                consumed.add(

                    Number(

                        row.SectionSubjectId

                    )

                );



                remainingHours.set(

                    Number(

                        row.SectionSubjectId

                    ),

                    0

                );

            }

        }

    }



    // --------------------------------------------------

    // REGULAR TASKS

    // --------------------------------------------------



    for (const row of subjects) {

        if (

            consumed.has(

                Number(

                    row.SectionSubjectId

                )

            )

        ) {

            continue;

        }



        const hours = Number(

            remainingHours.get(

                Number(

                    row.SectionSubjectId

                )

            )

        ) || 0;



        if (hours <= 0) {

            continue;

        }



        tasks.push({

            type:

                "Regular",



            teachingGroupId:

                row.TeachingGroupId ||

                null,



            subjectId:

                Number(

                    row.SubjectId

                ),



            rows:

                [row],



            teacherId:

                Number(

                    row.TeacherId

                ),



            requiredHours:

                hours

        });

    }



    // --------------------------------------------------

    // PRIORITY

    // --------------------------------------------------



    const priority = {

        ParallelBioMath:

            1,



        Common:

            2,



        Regular:

            3

    };



    tasks.sort(

        (a, b) => {



            const difference =

                (

                    priority[a.type] ||

                    99

                )

                -

                (

                    priority[b.type] ||

                    99

                );



            if (difference !== 0) {

                return difference;

            }



            return (

                Number(

                    b.requiredHours

                )

                -

                Number(

                    a.requiredHours

                )

            );

        }

    );



    return tasks;

};



// ======================================================

// ROOM FINDER FOR NORMAL / COMMON TASKS

// ======================================================



const findRoomForTask = (

    rooms,

    existingEntries,

    task,

    timeSlotId

) => {

    const distinctRows =

        getDistinctTaskRows(

            task

        );



    const campusId =

        Number(

            distinctRows[0]

                .CampusId

        );



    const requiredCapacity =

        getTaskCapacity(

            task

        );



    const needsLab =

        distinctRows.some(

            requiresLab

        );



    // --------------------------------------------------

    // REGULAR THEORY

    // --------------------------------------------------



    if (

        task.type ===

        "Regular" &&

        !needsLab

    ) {



        const assignedRoomId =

            Number(

                distinctRows[0]

                    .DefaultRoomId

            );



        if (!assignedRoomId) {

            return null;

        }



        const room =

            rooms.find(

                item =>

                    Number(

                        item.RoomId

                    ) ===

                    assignedRoomId

            );



        if (!room) {

            return null;

        }



        if (

            Number(

                room.CampusId

            ) !==

            campusId

        ) {

            return null;

        }



        if (

            Number(

                room.Capacity

            ) <

            requiredCapacity

        ) {

            return null;

        }



        if (

            hasRoomConflict(

                existingEntries,

                room.RoomId,

                timeSlotId

            )

        ) {

            return null;

        }



        return room;

    }



    // --------------------------------------------------

    // REGULAR PRACTICAL

    // --------------------------------------------------



    if (

        task.type ===

        "Regular" &&

        needsLab

    ) {



        const assignedRoomId =

            Number(

                distinctRows[0]

                    .DefaultRoomId

            );



        const assignedRoom =

            rooms.find(

                item =>

                    Number(

                        item.RoomId

                    ) ===

                    assignedRoomId

            );



        if (

            assignedRoom &&

            assignedRoom.IsLab &&

            Number(

                assignedRoom.CampusId

            ) ===

            campusId &&

            Number(

                assignedRoom.Capacity

            ) >=

            requiredCapacity &&

            !hasRoomConflict(

                existingEntries,

                assignedRoom.RoomId,

                timeSlotId

            )

        ) {

            return assignedRoom;

        }



        return (

            rooms.find(

                room =>

                    Number(

                        room.CampusId

                    ) ===

                    campusId &&

                    room.IsLab &&

                    Number(

                        room.Capacity

                    ) >=

                    requiredCapacity &&

                    !hasRoomConflict(

                        existingEntries,

                        room.RoomId,

                        timeSlotId

                    )

            )

            ||

            null

        );

    }



    // --------------------------------------------------

    // COMMON / TEACHING GROUP

    // --------------------------------------------------



    const assignedRoomIds = [

        ...new Set(

            distinctRows

                .map(

                    row =>

                        Number(

                            row.DefaultRoomId

                        )

                )

                .filter(

                    roomId =>

                        Number.isInteger(

                            roomId

                        ) &&

                        roomId > 0

                )

        )

    ];



    if (

        assignedRoomIds.length ===

        1

    ) {



        const sharedRoom =

            rooms.find(

                room =>

                    Number(

                        room.RoomId

                    ) ===

                    assignedRoomIds[0]

            );



        if (

            sharedRoom &&

            Number(

                sharedRoom.CampusId

            ) ===

            campusId &&

            Number(

                sharedRoom.Capacity

            ) >=

            requiredCapacity

        ) {



            if (

                !needsLab &&

                !hasRoomConflict(

                    existingEntries,

                    sharedRoom.RoomId,

                    timeSlotId

                )

            ) {

                return sharedRoom;

            }



            if (

                needsLab &&

                sharedRoom.IsLab &&

                !hasRoomConflict(

                    existingEntries,

                    sharedRoom.RoomId,

                    timeSlotId

                )

            ) {

                return sharedRoom;

            }

        }

    }



    return (

        rooms.find(

            room => {



                if (

                    Number(

                        room.CampusId

                    ) !==

                    campusId

                ) {

                    return false;

                }



                if (

                    Number(

                        room.Capacity

                    ) <

                    requiredCapacity

                ) {

                    return false;

                }



                if (

                    needsLab &&

                    !room.IsLab

                ) {

                    return false;

                }



                if (

                    hasRoomConflict(

                        existingEntries,

                        room.RoomId,

                        timeSlotId

                    )

                ) {

                    return false;

                }



                return true;

            }

        )

        ||

        null

    );

};



// ======================================================

// FREE ROOM FINDER FOR PARALLEL MATHEMATICS

//

// Conditions:

// - same campus

// - not allotted as DefaultRoom to active section

// - capacity enough

// - not Biology room

// - free in exact TimeSlot

// ======================================================



const findFreeArrangementRoom = ({

    rooms,

    allEntries,

    mathematicsRow,

    biologyRoomId,

    timeSlotId

}) => {



    const campusId =

        Number(

            mathematicsRow.CampusId

        );



    const studentCount =

        Number(

            mathematicsRow.StudentCount ||

            0

        );



    const candidates =

        rooms



            .filter(

                room => {



                    if (

                        Number(

                            room.CampusId

                        ) !==

                        campusId

                    ) {

                        return false;

                    }



                    if (

                        room.AssignedSectionId !==

                        null &&

                        room.AssignedSectionId !==

                        undefined

                    ) {

                        return false;

                    }



                    if (

                        Number(

                            room.Capacity

                        ) <

                        studentCount

                    ) {

                        return false;

                    }



                    if (

                        Number(

                            room.RoomId

                        ) ===

                        Number(

                            biologyRoomId

                        )

                    ) {

                        return false;

                    }



                    if (

                        hasRoomConflict(

                            allEntries,

                            room.RoomId,

                            timeSlotId

                        )

                    ) {

                        return false;

                    }



                    return true;

                }

            )



            .sort(

                (a, b) =>

                    Number(

                        a.Capacity

                    )

                    -

                    Number(

                        b.Capacity

                    )

            );



    return (

        candidates[0] ||

        null

    );

};



// ======================================================

// PARALLEL BIOLOGY + MATHEMATICS SCHEDULER

// ======================================================



const scheduleParallelBioMathTask = ({

    task,

    timeSlots,

    rooms,

    reservedEntries,

    generatedEntries,

    academicSessionId,

    rules

}) => {



    const biologyRow =

        task.biologyRow;



    const mathematicsRow =

        task.mathematicsRow;



    const usedDays =

        new Set();



    let scheduled =

        0;



    // --------------------------------------------------

    // BIOLOGY HOME ROOM

    // --------------------------------------------------



    const biologyRoom =

        rooms.find(

            room =>

                Number(

                    room.RoomId

                ) ===

                Number(

                    biologyRow.DefaultRoomId

                )

        );



    if (!biologyRoom) {

        throw new Error(

            `Biology home classroom for ${biologyRow.SectionCode} was not found or is inactive.`

        );

    }



    if (

        Number(

            biologyRoom.CampusId

        ) !==

        Number(

            biologyRow.CampusId

        )

    ) {

        throw new Error(

            `Biology classroom for ${biologyRow.SectionCode} belongs to a different campus.`

        );

    }



    if (

        Number(

            biologyRoom.Capacity

        ) <

        Number(

            biologyRow.StudentCount ||

            0

        )

    ) {

        throw new Error(

            `Biology classroom ${biologyRoom.RoomNumber} is too small for ${biologyRow.SectionCode}.`

        );

    }



    if (

        Number(

            biologyRow.TeacherId

        ) ===

        Number(

            mathematicsRow.TeacherId

        )

    ) {

        throw new Error(

            `Biology and Mathematics for ${biologyRow.SectionCode} / ${mathematicsRow.SectionCode} have the same teacher, so parallel scheduling is impossible.`

        );

    }



    // --------------------------------------------------

    // TRY SLOT

    // --------------------------------------------------



    const trySlot = slot => {



        if (

            scheduled >=

            Number(

                task.requiredHours

            )

        ) {

            return false;

        }



        const dayOfWeek =

            Number(

                slot.DayOfWeek

            );



        // Max one parallel Bio/Math class per day.

        if (

            usedDays.has(

                dayOfWeek

            )

        ) {

            return false;

        }



        const allEntries = [

            ...reservedEntries,

            ...generatedEntries

        ];



        // --------------------------------------------------

        // SECTION CONFLICTS

        // --------------------------------------------------



        if (

            hasSectionConflict(

                allEntries,

                biologyRow.SectionId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        if (

            hasSectionConflict(

                allEntries,

                mathematicsRow.SectionId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        // --------------------------------------------------

        // TEACHER CONFLICTS

        // --------------------------------------------------



        if (

            hasTeacherConflict(

                allEntries,

                biologyRow.TeacherId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        if (

            hasTeacherConflict(

                allEntries,

                mathematicsRow.TeacherId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        // --------------------------------------------------

        // CONFIGURABLE RULES

        // --------------------------------------------------


        if (
            !passesConfigurableRules({
                row:
                    biologyRow,

                teacherId:
                    biologyRow.TeacherId,

                subjectId:
                    biologyRow.SubjectId,

                sectionId:
                    biologyRow.SectionId,

                slot,

                allEntries,

                timeSlots,

                rules
            })
        ) {

            return false;
        }


        if (
            !passesConfigurableRules({
                row:
                    mathematicsRow,

                teacherId:
                    mathematicsRow.TeacherId,

                subjectId:
                    mathematicsRow.SubjectId,

                sectionId:
                    mathematicsRow.SectionId,

                slot,

                allEntries,

                timeSlots,

                rules
            })
        ) {

            return false;
        }



        // --------------------------------------------------

        // BIOLOGY ROOM FREE?

        // --------------------------------------------------



        if (

            hasRoomConflict(

                allEntries,

                biologyRoom.RoomId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        // --------------------------------------------------

        // FIND FREE MATHEMATICS ROOM

        // --------------------------------------------------



        const arrangementRoom =

            findFreeArrangementRoom({

                rooms,

                allEntries,

                mathematicsRow,

                biologyRoomId:

                    biologyRoom.RoomId,

                timeSlotId:

                    slot.TimeSlotId

            });



        if (!arrangementRoom) {

            return false;

        }



        // --------------------------------------------------

        // BIOLOGY ENTRY

        // --------------------------------------------------



        generatedEntries.push({



            SectionSubjectId:

                Number(

                    biologyRow.SectionSubjectId

                ),



            SectionId:

                Number(

                    biologyRow.SectionId

                ),



            SubjectId:

                Number(

                    biologyRow.SubjectId

                ),



            TeacherId:

                Number(

                    biologyRow.TeacherId

                ),



            RoomId:

                Number(

                    biologyRoom.RoomId

                ),



            TimeSlotId:

                Number(

                    slot.TimeSlotId

                ),



            AcademicSessionId:

                Number(

                    academicSessionId

                ),



            ClassType:

                "Regular",



            Notes:

                `Parallel Biology/Mathematics - Biology in ${biologyRoom.RoomNumber}`



        });



        // --------------------------------------------------

        // MATHEMATICS ENTRY

        // SAME TIMESLOT

        // DYNAMIC FREE ROOM

        // --------------------------------------------------



        generatedEntries.push({



            SectionSubjectId:

                Number(

                    mathematicsRow.SectionSubjectId

                ),



            SectionId:

                Number(

                    mathematicsRow.SectionId

                ),



            SubjectId:

                Number(

                    mathematicsRow.SubjectId

                ),



            TeacherId:

                Number(

                    mathematicsRow.TeacherId

                ),



            RoomId:

                Number(

                    arrangementRoom.RoomId

                ),



            TimeSlotId:

                Number(

                    slot.TimeSlotId

                ),



            AcademicSessionId:

                Number(

                    academicSessionId

                ),



            ClassType:

                "Regular",



            Notes:

                `Parallel Biology/Mathematics - Mathematics arrangement room ${arrangementRoom.RoomNumber}`



        });



        scheduled++;



        usedDays.add(

            dayOfWeek

        );



        return true;

    };



    // --------------------------------------------------

    // SCHEDULE PAIRS

    // --------------------------------------------------



    for (

        const slot

        of timeSlots

    ) {



        if (

            scheduled >=

            Number(

                task.requiredHours

            )

        ) {

            break;

        }



        trySlot(

            slot

        );

    }



    return scheduled;

};



// ======================================================

// NORMAL / COMMON SCHEDULER

// ======================================================



const scheduleTask = ({

    task,

    timeSlots,

    rooms,

    reservedEntries,

    generatedEntries,

    academicSessionId,

    rules

}) => {



    const usedDays =

        new Set();



    let scheduled =

        0;



    const trySlot = (

        slot,

        enforceDifferentDay

    ) => {



        if (

            scheduled >=

            task.requiredHours

        ) {

            return false;

        }



        const dayOfWeek =

            Number(

                slot.DayOfWeek

            );



        if (

            enforceDifferentDay &&

            usedDays.has(

                dayOfWeek

            )

        ) {

            return false;

        }



        const allEntries = [

            ...reservedEntries,

            ...generatedEntries

        ];



        // --------------------------------------------------

        // SECTION CONFLICT

        // --------------------------------------------------



        for (

            const row

            of getDistinctTaskRows(

                task

            )

        ) {



            if (

                hasSectionConflict(

                    allEntries,

                    row.SectionId,

                    slot.TimeSlotId

                )

            ) {

                return false;

            }

        }



        // --------------------------------------------------

        // TEACHER CONFLICT

        // --------------------------------------------------



        if (

            hasTeacherConflict(

                allEntries,

                task.teacherId,

                slot.TimeSlotId

            )

        ) {

            return false;

        }



        // --------------------------------------------------

        // CONFIGURABLE RULES

        // --------------------------------------------------


        for (
            const row
            of getDistinctTaskRows(
                task
            )
        ) {

            const allowed =
                passesConfigurableRules({
                    row,

                    teacherId:
                        row.TeacherId,

                    subjectId:
                        row.SubjectId,

                    sectionId:
                        row.SectionId,

                    slot,

                    allEntries,

                    timeSlots,

                    rules
                });


            if (!allowed) {

                return false;
            }
        }



        // --------------------------------------------------

        // ROOM

        // --------------------------------------------------



        const room =

            findRoomForTask(

                rooms,

                allEntries,

                task,

                slot.TimeSlotId

            );



        if (!room) {

            return false;

        }



        // --------------------------------------------------

        // ADD ENTRIES

        // --------------------------------------------------



        for (

            const row

            of task.rows

        ) {



            generatedEntries.push({



                SectionSubjectId:

                    Number(

                        row.SectionSubjectId

                    ),



                SectionId:

                    Number(

                        row.SectionId

                    ),



                SubjectId:

                    Number(

                        row.SubjectId

                    ),



                TeacherId:

                    Number(

                        row.TeacherId

                    ),



                RoomId:

                    Number(

                        room.RoomId

                    ),



                TimeSlotId:

                    Number(

                        slot.TimeSlotId

                    ),



                AcademicSessionId:

                    Number(

                        academicSessionId

                    ),



                ClassType:

                    task.type ===

                    "Common"

                        ? "Common"

                        : "Regular",



                Notes:

                    task.type ===

                    "Common"

                        ? `Shared Teaching Group lecture - ${row.SubjectName}`

                        : `Auto generated - ${row.SubjectName}`



            });

        }



        scheduled++;



        usedDays.add(

            dayOfWeek

        );



        return true;

    };



    // --------------------------------------------------

    // PASS 1 - DIFFERENT DAYS

    // --------------------------------------------------



    for (

        const slot

        of timeSlots

    ) {



        if (

            scheduled >=

            task.requiredHours

        ) {

            break;

        }



        trySlot(

            slot,

            true

        );

    }



    // --------------------------------------------------

    // PASS 2 - SAME DAY IF REQUIRED

    // --------------------------------------------------



    if (

        scheduled <

        task.requiredHours

    ) {



        for (

            const slot

            of timeSlots

        ) {



            if (

                scheduled >=

                task.requiredHours

            ) {

                break;

            }



            trySlot(

                slot,

                false

            );

        }

    }



    return scheduled;

};



// ======================================================

// INSERT GENERATED ENTRIES


const validateHomeRooms = (

    subjects,

    rooms

) => {



    const uniqueSections =

        new Map();



    for (

        const row

        of subjects

    ) {



        if (

            !uniqueSections.has(

                Number(

                    row.SectionId

                )

            )

        ) {



            uniqueSections.set(

                Number(

                    row.SectionId

                ),

                row

            );

        }

    }



    for (

        const row

        of uniqueSections.values()

    ) {



        if (

            !row.DefaultRoomId

        ) {



            throw new Error(

                `Please assign a classroom to section ${row.SectionCode} before generating timetable.`

            );

        }



        const room =

            rooms.find(

                item =>

                    Number(

                        item.RoomId

                    ) ===

                    Number(

                        row.DefaultRoomId

                    )

            );



        if (!room) {



            throw new Error(

                `Assigned classroom for ${row.SectionCode} does not exist or is inactive. RoomId=${row.DefaultRoomId}.`

            );

        }



        if (

            Number(

                room.CampusId

            ) !==

            Number(

                row.CampusId

            )

        ) {



            throw new Error(

                `Assigned classroom for ${row.SectionCode} belongs to a different campus.`

            );

        }



        if (

            Number(

                room.Capacity

            ) <

            Number(

                row.StudentCount ||

                0

            )

        ) {



            throw new Error(

                `Classroom ${room.RoomNumber} is too small for section ${row.SectionCode}.`

            );

        }

    }

};



// ======================================================

// VALIDATE FREE ARRANGEMENT ROOMS

//

// No hard-coded R104 / R113.

// ======================================================



const validateArrangementRooms = (

    subjects,

    rooms,

    rules = []

) => {


    const bioMathRule =
        timetableRuleService
            .getBestRule(
                rules,
                "BIO_MATH_PARALLEL",
                {}
            );


    if (!bioMathRule) {

        return;
    }


    const academicGroups =

        new Map();



    for (

        const row

        of subjects

    ) {



        const key =

            `${Number(

                row.CampusId

            )}|${Number(

                row.ClassYearId

            )}`;



        if (

            !academicGroups.has(

                key

            )

        ) {



            academicGroups.set(

                key,

                []

            );

        }



        academicGroups

            .get(key)

            .push(row);

    }



    for (

        const rows

        of academicGroups.values()

    ) {



        const biologyRow =

            rows.find(

                row =>

                    isPreMedicalSection(

                        row

                    ) &&

                    isBiologySubject(

                        row

                    )

            );



        const mathematicsRow =

            rows.find(

                row =>

                    isPreEngineeringSection(

                        row

                    ) &&

                    isMathematicsSubject(

                        row

                    )

            );



        if (

            !biologyRow ||

            !mathematicsRow

        ) {

            continue;

        }



        const campusId =

            Number(

                mathematicsRow.CampusId

            );



        const studentCount =

            Number(

                mathematicsRow.StudentCount ||

                0

            );



        const availableRooms =

            rooms.filter(

                room => {



                    if (

                        Number(

                            room.CampusId

                        ) !==

                        campusId

                    ) {

                        return false;

                    }



                    if (

                        room.AssignedSectionId !==

                        null &&

                        room.AssignedSectionId !==

                        undefined

                    ) {

                        return false;

                    }



                    if (

                        Number(

                            room.Capacity

                        ) <

                        studentCount

                    ) {

                        return false;

                    }



                    if (

                        Number(

                            room.RoomId

                        ) ===

                        Number(

                            biologyRow.DefaultRoomId

                        )

                    ) {

                        return false;

                    }



                    return true;

                }

            );



        if (

            availableRooms.length ===

            0

        ) {



            throw new Error(

                `No unallocated classroom with enough capacity is available on the same campus for ${mathematicsRow.SectionCode}.`

            );

        }

    }

};



// ======================================================

// GENERATE TIMETABLE

// ======================================================

async function generateTimetable({ academicSessionId, clearExisting, previewOnly, previewFingerprint }) {
    return withTimetableLock(academicSessionId, async db => {
        const data = await getSchedulingData(academicSessionId, db);
        const reservedEntries = clearExisting ? [] : data.entries;
        const counts = placedPeriods(reservedEntries);
        const assignments = new Map(data.assignments.map(row => [row.SectionSubjectId, row]));
        const subjects = activeAssignments(data.assignments)
            .filter(row => !assignmentProblem(row))
            .map(row => ({ ...row, WeeklyHours: Math.max(0, row.WeeklyHours - (counts.get(row.SectionSubjectId) || 0)) }));
        const timeSlots = data.timeSlots.filter(slot => slot.IsActive);
        const rooms = data.rooms.filter(room => room.IsActive);
        const rules = data.rules;
        const needed = subjects.filter(row => row.WeeklyHours > 0);

        if (needed.length && timeSlots.some((slot, index) => overlapping(slot, timeSlots[index + 1]))) {
            throw new HttpError(422, "Active time slots overlap. Fix the time slot definitions and try again.");
        }
        if (needed.length && timeSlots.length && rooms.length) {
            try {
                validateHomeRooms(needed, rooms);
                validateArrangementRooms(needed, rooms, rules);
            } catch (error) {
                throw new HttpError(422, error.message);
            }
        }

        const tasks = buildTasks(subjects, rules);
        const generatedEntries = [];
        for (const task of tasks) {
            const schedule = task.type === "ParallelBioMath" ? scheduleParallelBioMathTask : scheduleTask;
            if (timeSlots.length && rooms.length) {
                schedule({ task, timeSlots, rooms, reservedEntries, generatedEntries, academicSessionId, rules });
            }
        }

        const slotsById = new Map(timeSlots.map(slot => [slot.TimeSlotId, slot]));
        const roomsById = new Map(rooms.map(room => [room.RoomId, room]));
        const candidates = generatedEntries.map(entry => ({
            ...assignments.get(entry.SectionSubjectId),
            ...slotsById.get(entry.TimeSlotId),
            ...entry,
            RoomName: roomsById.get(entry.RoomId)?.RoomName,
            RoomNumber: roomsById.get(entry.RoomId)?.RoomNumber
        }));
        const result = evaluateSchedule(data, [...reservedEntries, ...candidates]);
        const fingerprint = createHash("sha256").update(JSON.stringify({
            academicSessionId, clearExisting, saved: data.entries, candidates, rules, rooms, timeSlots, result
        })).digest("hex");
        const response = {
            ...result, academicSessionId, totalGenerated: candidates.length, taskCount: tasks.length,
            unscheduledCount: result.missingAssignments.length, unscheduled: result.missingAssignments,
            previewFingerprint: fingerprint, entries: candidates
        };
        if (previewOnly) return response;

        if (previewFingerprint && previewFingerprint !== fingerprint) {
            throw new HttpError(409, "The timetable or its settings changed. Generate a new preview.");
        }
        if (!result.isValid) {
            throw new HttpError(422, "The proposed timetable is incomplete or has conflicts. Review the preview details.", response);
        }
        if (clearExisting && data.entries.length && !previewFingerprint) {
            throw new HttpError(409, "Preview the replacement and confirm it before saving.");
        }
        if (clearExisting) await clearEntries(db, academicSessionId);
        await insertEntries(db, candidates);
        return response;
    });
}

async function deleteGeneratedTimetable(academicSessionId) {
    return withTimetableLock(academicSessionId, db => clearEntries(db, academicSessionId));
}

module.exports = {
    generateTimetable, deleteGeneratedTimetable,
    getGeneratedTimetable: sessionId => listEntries({ sessionId })
};
