/**
 * Postgres can close an idle connection of the pool, for example in a
 * restart. The pool then emits "error", and an "error" event with no listener
 * stops the gateway and the workflows host. No test connects to Postgres: the
 * pool opens a connection only for a query.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../app/store.js";

describe("db", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("logs the error of an idle connection and does not throw it", () => {
		vi.stubEnv("DATABASE_URL", "postgres://factory@127.0.0.1:5432/factory");
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		const error = new Error(
			"terminating connection due to administrator command",
		);

		expect(() => db().emit("error", error)).not.toThrow();
		expect(logged).toHaveBeenCalledWith(
			"Lost an idle Postgres connection:",
			error,
		);
	});
});
