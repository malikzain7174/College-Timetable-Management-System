const express =
    require("express");


const router =
    express.Router();


const departmentController =
    require(
        "../controllers/departmentController"
    );


// GET ALL
router.get(
    "/",
    departmentController
        .getAllDepartments
);


// GET BY ID
router.get(
    "/:id",
    departmentController
        .getDepartmentById
);


// CREATE
router.post(
    "/",
    departmentController
        .createDepartment
);


// UPDATE
router.put(
    "/:id",
    departmentController
        .updateDepartment
);


// DELETE
router.delete(
    "/:id",
    departmentController
        .deleteDepartment
);


module.exports =
    router;