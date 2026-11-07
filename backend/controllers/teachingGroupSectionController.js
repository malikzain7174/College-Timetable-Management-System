const memberships = require("../services/teachingGroupSectionService");
const { HttpError, positiveId } = require("../lib/httpError");

const membershipId = req => positiveId(req.params.id, "membership ID");
const groupId = req => positiveId(req.params.teachingGroupId, "teaching group ID");
const readMembership = (body = {}) => ({
    TeachingGroupId: positiveId(body.TeachingGroupId, "teaching group ID"),
    SectionId: positiveId(body.SectionId, "section ID")
});

async function getAllTeachingGroupSections(req, res) {
    res.json(await memberships.getAllTeachingGroupSections());
}

async function getByTeachingGroupId(req, res) {
    res.json(await memberships.getByTeachingGroupId(groupId(req)));
}

async function getTeachingGroupSectionById(req, res) {
    const row = await memberships.getTeachingGroupSectionById(membershipId(req));
    if (!row) throw new HttpError(404, "Teaching group membership not found.");
    res.json(row);
}

async function createTeachingGroupSection(req, res) {
    const data = await memberships.createTeachingGroupSection(readMembership(req.body || {}));
    res.status(201).json({ message: "Section added to teaching group.", data });
}

async function updateTeachingGroupSection(req, res) {
    const data = await memberships.updateTeachingGroupSection(membershipId(req), readMembership(req.body || {}));
    res.json({ message: "Teaching group membership updated.", data });
}

async function deleteTeachingGroupSection(req, res) {
    await memberships.deleteTeachingGroupSection(membershipId(req));
    res.json({ message: "Section removed from teaching group." });
}

async function syncTeachingGroupSections(req, res) {
    const { SectionIds } = req.body || {};
    if (!Array.isArray(SectionIds)) throw new HttpError(400, "SectionIds must be an array.");
    const ids = [...new Set(SectionIds.map(id => positiveId(id, "section ID")))];
    await memberships.syncTeachingGroupSections(groupId(req), ids);
    res.json({ message: "Teaching group sections updated." });
}

module.exports = {
    getAllTeachingGroupSections, getByTeachingGroupId, getTeachingGroupSectionById,
    createTeachingGroupSection, updateTeachingGroupSection, deleteTeachingGroupSection, syncTeachingGroupSections
};
