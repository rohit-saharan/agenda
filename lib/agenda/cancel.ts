import { Agenda } from ".";
import createDebugger from "debug";
import { FilterQuery } from "mongodb";

const debug = createDebugger("agenda:cancel");

/**
 * Cancels any jobs matching the passed MongoDB query, and removes them from the database.
 * @name Agenda#cancel
 * @function
 * @param query MongoDB query to use when cancelling
 * @caller client code, Agenda.purge(), Job.remove()
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cancel = async function (
  this: Agenda,
  query: FilterQuery<any>
): Promise<number | undefined> {
  debug("attempting to cancel all Agenda jobs", query);
  try {
    if (this._pg) {
      let res;
      if (query && Object.keys(query).length && (query as any).name) {
        res = await this._pg.query(
          `DELETE FROM ${this._pgTable} WHERE name = $1`,
          [(query as any).name]
        );
      } else {
        res = await this._pg.query(`DELETE FROM ${this._pgTable}`);
      }
      debug("%s jobs cancelled", res.rowCount);
      return res.rowCount;
    } else {
      const { result } = await this._collection.deleteMany(query);
      debug("%s jobs cancelled", result.n);
      return result.n;
    }
  } catch (error) {
    debug("error trying to delete jobs from MongoDB");
    throw error;
  }
};
