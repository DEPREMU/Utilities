import { Validations } from "../../both/validations";
import { describe, expect, it } from "@jest/globals";

describe("Validations", () => {
  describe("isValidPassword", () => {
    it("should return true for a valid password", () => {
      expect(Validations.isValidPassword("ValidPsw1!")).toBe(true);
    });

    it("should return false for a password without uppercase letters", () => {
      expect(Validations.isValidPassword("invalid1!")).toBe(false);
    });

    it("should return false for a password without lowercase letters", () => {
      expect(Validations.isValidPassword("INVALID1!")).toBe(false);
    });

    it("should return false for a password without numeric digits", () => {
      expect(Validations.isValidPassword("Invalid!")).toBe(false);
    });

    it("should return false for a password without special characters", () => {
      expect(Validations.isValidPassword("Invalid1")).toBe(false);
    });

    it("should return false for a password shorter than 8 characters", () => {
      expect(Validations.isValidPassword("Inv1!")).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("should return true for a valid email", () => {
      expect(Validations.isValidEmail("test@example.com")).toBe(true);
    });

    it("should return false for an invalid email", () => {
      expect(Validations.isValidEmail("invalid-email")).toBe(false);
    });
  });

  describe("getSumVersion", () => {
    it("should return the correct sum for a valid version string", () => {
      expect(Validations.getSumVersion("1.2.3")).toBe(1002003);
    });

    it("should return 0 for an invalid version string", () => {
      expect(Validations.getSumVersion("invalid.version")).toBe(0);
    });
  });

  describe("isNewVersion", () => {
    it("should return true if the latest version is newer than the current version", () => {
      expect(Validations.isNewVersion("1.2.3", "1.2.4")).toBe(true);
    });

    it("should return false if the latest version is not newer than the current version", () => {
      expect(Validations.isNewVersion("1.2.3", "1.2.3")).toBe(false);
      expect(Validations.isNewVersion("1.2.4", "1.2.3")).toBe(false);
    });
  });
});
