"use strict";

const { getPgPool } = require("./client");

const id = value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new TypeError("A positive numeric ID is required.");
  return number;
};
const columns = '"DepartmentId", "DepartmentName", "DepartmentCode", "IsActive", "CreatedAt"';
const flag = value => value ? 1 : 0;

function createDepartmentService(pool = getPgPool()) {
  const getAllDepartments = async () =>
    (await pool.query(`SELECT ${columns} FROM "Departments" ORDER BY "DepartmentName"`)).rows;
  const getDepartmentById = async departmentId =>
    (await pool.query(`SELECT ${columns} FROM "Departments" WHERE "DepartmentId" = $1`, [id(departmentId)])).rows[0];
  const findDuplicateDepartment = async (name, code, excludeDepartmentId = null) => {
    const params = [name, code];
    let exclusion = "";
    if (excludeDepartmentId !== null) {
      params.push(id(excludeDepartmentId));
      exclusion = ' AND "DepartmentId" <> $3';
    }
    const result = await pool.query(`
      SELECT "DepartmentId", "DepartmentName", "DepartmentCode" FROM "Departments"
      WHERE (lower("DepartmentName") = lower($1) OR lower("DepartmentCode") = lower($2))
      ${exclusion} LIMIT 1
    `, params);
    return result.rows[0];
  };
  const createDepartment = async department =>
    (await pool.query(`
      INSERT INTO "Departments" ("DepartmentName", "DepartmentCode", "IsActive")
      VALUES ($1, $2, $3) RETURNING "DepartmentId"
    `, [department.DepartmentName, department.DepartmentCode, flag(department.IsActive)])).rows[0];
  const updateDepartment = async (departmentId, department) =>
    (await pool.query(`
      UPDATE "Departments" SET "DepartmentName" = $2, "DepartmentCode" = $3, "IsActive" = $4
      WHERE "DepartmentId" = $1
    `, [id(departmentId), department.DepartmentName, department.DepartmentCode, flag(department.IsActive)])).rowCount;
  const deleteDepartment = async departmentId =>
    (await pool.query('DELETE FROM "Departments" WHERE "DepartmentId" = $1', [id(departmentId)])).rowCount;
  return { getAllDepartments, getDepartmentById, findDuplicateDepartment, createDepartment, updateDepartment, deleteDepartment };
}
module.exports = { createDepartmentService };
