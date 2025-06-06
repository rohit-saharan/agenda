import createDebugger from "debug";
import { createJob } from "../utils";
import { Agenda } from ".";
import { Job } from "../job";

const debug = createDebugger("agenda:internal:_findAndLockNextJob");

/**
 * Find and lock jobs
 * @name Agenda#findAndLockNextJob
 * @function
 * @param jobName name of job to try to lock
 * @param definition definition used to tell how job is run
 * @access protected
 * @caller jobQueueFilling() only
 */
export const findAndLockNextJob = async function (
  this: Agenda,
  jobName: string,
  definition: any
): Promise<Job | undefined> {
  const now = new Date();
  const lockDeadline = new Date(Date.now().valueOf() - definition.lockLifetime);
  debug("_findAndLockNextJob(%s, [Function])", jobName);

  if (this._pg) {
    const res = await this._pg.query(
      `UPDATE ${this._pgTable} SET locked_at = NOW() WHERE id = (
        SELECT id FROM ${this._pgTable}
        WHERE name = $1
          AND (locked_at IS NULL OR locked_at <= $2)
          AND next_run_at <= $3
          AND (disabled IS NULL OR disabled = FALSE)
        ORDER BY next_run_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      ) RETURNING *`,
      [jobName, lockDeadline, this._nextScanAt]
    );
    if (res.rows.length) {
      const row = res.rows[0];
      return createJob(this, {
        ...row,
        _id: row.id,
        nextRunAt: row.next_run_at,
        lockedAt: row.locked_at,
      });
    }
    return undefined;
  }

  // Don't try and access MongoDB if we've lost connection to it.
  // Trying to resolve crash on Dev PC when it resumes from sleep. NOTE: Does this still happen?
  // @ts-expect-error
  const s = this._mdb.s || this._mdb.db.s;
  if (
    s.topology.connections &&
    s.topology.connections().length === 0 &&
    !this._mongoUseUnifiedTopology
  ) {
    if (s.topology.autoReconnect && !s.topology.isDestroyed()) {
      // Continue processing but notify that Agenda has lost the connection
      debug(
        "Missing MongoDB connection, not attempting to find and lock a job"
      );
      this.emit("error", new Error("Lost MongoDB connection"));
    } else {
      // No longer recoverable
      debug(
        "topology.autoReconnect: %s, topology.isDestroyed(): %s",
        s.topology.autoReconnect,
        s.topology.isDestroyed()
      );
      throw new Error(
        "MongoDB connection is not recoverable, application restart required"
      );
    }
  } else {
    // /**
    // * Query used to find job to run
    // * @type {{$and: [*]}}
    // */
    const JOB_PROCESS_WHERE_QUERY = {
      $and: [
        {
          name: jobName,
          disabled: { $ne: true },
        },
        {
          $or: [
            {
              lockedAt: { $eq: null },
              nextRunAt: { $lte: this._nextScanAt },
            },
            {
              lockedAt: { $lte: lockDeadline },
            },
          ],
        },
      ],
    };

    /**
     * Query used to set a job as locked
     * @type {{$set: {lockedAt: Date}}}
     */
    const JOB_PROCESS_SET_QUERY = { $set: { lockedAt: now } };

    /**
     * Query used to affect what gets returned
     * @type {{returnDocument: 'after' | 'before', sort: object}}
     */
    const JOB_RETURN_QUERY = { returnDocument: "after" as const, sort: this._sort };

    // Find ONE and ONLY ONE job and set the 'lockedAt' time so that job begins to be processed
    const result = await this._collection.findOneAndUpdate(
      JOB_PROCESS_WHERE_QUERY,
      JOB_PROCESS_SET_QUERY,
      JOB_RETURN_QUERY
    );

    let job: Job | undefined = undefined;
    if (result.value) {
      debug(
        "found a job available to lock, creating a new job on Agenda with id [%s]",
        result.value._id
      );
      job = createJob(this, result.value);
    }

    return job;
  }
};
