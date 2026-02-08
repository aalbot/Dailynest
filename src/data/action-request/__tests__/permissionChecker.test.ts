import { hasPermission } from "../permissions/permissionChecker";

test("allows valid role", () => {
  expect(
    hasPermission(
      { userId: "1", roles: ["Admin"], apps: [] },
      { roles: ["Admin"] }
    )
  ).toBe(true);
});

test("blocks invalid role", () => {
  expect(
    hasPermission(
      { userId: "1", roles: ["User"], apps: [] },
      { roles: ["Admin"] }
    )
  ).toBe(false);
});
