/**
 * Postgres can close a connection of the pool, for example in a restart. For
 * an idle connection, the pool emits "error". For a connection that a
 * transaction holds, the client emits "error". An "error" event with no
 * listener stops the gateway and the workflows host. No test connects to
 * Postgres: the pool opens a connection only for a query, and the transaction
 * gets a fake client.
 */
import { EventEmitter } from "node:events";
import type { PoolClient } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { claimDelete, db } from "../app/store.js";

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

describe("the transaction of an app lock", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("logs the error of a closed connection and gives the caller the error of the query", async () => {
		vi.stubEnv("DATABASE_URL", "postgres://factory@127.0.0.1:5432/factory");
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		const terminated = new Error(
			"terminating connection due to administrator command",
		);
		const closed = new Error("Connection terminated unexpectedly");
		// As in pg after pg_terminate_backend(): the lock query fails, and the
		// rollback waits. Then the socket closes, and the client emits "error".
		let failRollback: (error: Error) => void = () => {};
		const rollback = new Promise((_, reject) => {
			failRollback = reject;
		});
		const client = Object.assign(new EventEmitter(), {
			release: vi.fn(),
			query: vi.fn(async (text: string) => {
				if (text === "begin") return { rows: [] };
				if (text === "rollback") return rollback;
				throw terminated;
			}),
		});
		vi.spyOn(db(), "connect").mockImplementation(
			async () => client as unknown as PoolClient,
		);

		const claim = claimDelete("demo", "furniture-catalog");
		await vi.waitFor(() =>
			expect(client.query).toHaveBeenLastCalledWith("rollback"),
		);
		expect(() => client.emit("error", closed)).not.toThrow();
		failRollback(closed);

		await expect(claim).rejects.toBe(terminated);
		expect(logged).toHaveBeenCalledWith(
			"Lost a Postgres connection in a transaction:",
			closed,
		);
		// The pool gives this client to the next transaction, so no listener
		// can remain.
		expect(client.listenerCount("error")).toBe(0);
		expect(client.release).toHaveBeenCalledOnce();
	});
});
