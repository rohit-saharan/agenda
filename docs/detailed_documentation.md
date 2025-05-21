# Agenda Detailed Documentation

Agenda is a light-weight job scheduling library for Node.js backed by MongoDB or PostgreSQL. It allows you to define recurring or one-off jobs with flexible scheduling, priorities and concurrency controls. This guide consolidates the core information from the README and JSDoc output into a single document along with frequently asked questions.

## Overview for Newcomers

If you are new to Agenda, start here. Agenda lets you define **jobs** in your
codebase and schedule them to run later or repeatedly. A job might send an
email, process a video or clean up stale data. Agenda stores job definitions and
their scheduled run times in your database so that work persists across
application restarts. Workers pull jobs from the database and run them according
to the schedule you set. Because Agenda uses your existing MongoDB or Postgres
database, you get reliability without having to manage a separate queueing
system.

## Table of Contents

- [Overview for Newcomers](#overview-for-newcomers)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
- [Defining Jobs](#defining-jobs)
- [Scheduling Jobs](#scheduling-jobs)
- [Job Management](#job-management)
- [Job Instance Methods](#job-instance-methods)
- [Events](#events)
- [Example Project Structure](#example-project-structure)
- [Troubleshooting](#troubleshooting)
- [Frequently Asked Questions](#frequently-asked-questions)

## Prerequisites

- **Node.js v16 or newer** is required.
- A running **MongoDB v3** or later or a **PostgreSQL** database instance.

## Installation

Install Agenda from npm:

```bash
npm install agenda
```

Agenda exposes both CommonJS and ES module entry points. In TypeScript or other module based builds use the `agenda/es` entry:

```ts
import { Agenda } from 'agenda/es';
```

## Basic Usage

Create an Agenda instance with a database connection, define a job and start the processor:

```js
import { Agenda } from 'agenda/es';

const agenda = new Agenda({ db: { address: 'mongodb://localhost/agenda' } });

agenda.define('delete old users', async () => {
  await User.remove({ lastLogIn: { $lt: twoDaysAgo } });
});

(async function () {
  await agenda.start();
  await agenda.every('3 minutes', 'delete old users');
})();
```

## Configuration

Agenda instances can be customized extensively:

- **database(url, collection?)** – specify the MongoDB connection string and optional collection name.
- **mongo(mongoClient)** – use an existing `MongoClient`.
- **postgres(options)** – connect to PostgreSQL.
- **name(name)** – set the value stored in the `lastModifiedBy` field.
- **processEvery(interval)** – how often Agenda checks for jobs, e.g. `"30 seconds"`.
- **maxConcurrency(number)** – total number of jobs that can run at once.
- **defaultConcurrency(number)** – default concurrency for each job type.
- **lockLimit(number)** – maximum number of jobs that can be locked at once.
- **defaultLockLimit(number)** – default lock limit for a job type.
- **defaultLockLifetime(ms)** – default time a job stays locked.
- **sort(query)** – MongoDB sort used when finding and locking jobs.

These methods can be chained on the Agenda instance or passed via the constructor options.

## Defining Jobs

Use `agenda.define(jobName, [options], handler)` to register a job processor. The handler can return a promise or use a Node-style callback.

```js
agenda.define('send email', { priority: 'high', concurrency: 5 }, async job => {
  const { to } = job.attrs.data;
  await emailClient.send({
    to,
    from: 'example@example.com',
    subject: 'Hello',
    body: 'Welcome to Agenda'
  });
});
```

## Scheduling Jobs

Agenda supports recurring and one-off jobs:

- **every(interval, name, [data], [options])** – run the job on a repeating interval. The interval may be human readable (`'5 minutes'`), cron syntax or a number in milliseconds.
- **schedule(when, name, [data])** – schedule the job to run once at the specified time.
- **now(name, [data])** – run the job immediately.
- **create(name, data)** – create a job instance without saving to the database.

When `name` is an array each job name is scheduled for the same interval or date.

## Job Management

Agenda provides helpers for working with jobs stored in the database:

- **jobs(query, sort, limit, skip)** – query all jobs.
- **cancel(query)** – remove jobs matching a query.
- **purge()** – remove all jobs without definitions.
- **start() / stop()** – start or stop processing jobs.
- **close(force?)** – close the database connection.

## Job Instance Methods

Job objects expose a large API. Common methods include:

- **repeatEvery(interval, options?)** – set the job to repeat at the given interval.
- **repeatAt(time)** – repeat the job at a specific time.
- **schedule(time)** – set the next run time.
- **priority(value)** – set priority using a string (`'high'`, `'low'`) or number.
- **unique(properties, options?)** – ensure uniqueness.
- **fail(reason)** – mark the job as failed.
- **run()** – manually run the job.
- **save()** – persist changes to the database.
- **remove()** – delete the job from the database.
- **disable()/enable()** – toggle whether the job runs.
- **touch()** – reset the lock timeout when running long jobs.

## Events

Agenda instances emit useful events:

- `ready` – database connection established and indexes created.
- `error` – Mongo or Postgres error occurred.
- `start` / `start:job name` – job is about to run.
- `complete` / `complete:job name` – job finished (success or fail).
- `success` / `success:job name` – job succeeded.
- `fail` / `fail:job name` – job failed.

Use these to log job activity or integrate with monitoring tools.

## Example Project Structure

A common project layout separates job definitions from the rest of the application:

```
- server.js
- worker.js
lib/
  agenda.js
  controllers/
    user-controller.js
  jobs/
    email.js
    video-processing.js
    image-processing.js
  models/
    user-model.js
    blog-post.model.js
```

The worker would load specific job types from `lib/jobs` and start Agenda. The web server can schedule jobs without processing them.

## Troubleshooting

- Enable debug logging with `DEBUG="agenda:*" node your-app.js` to see detailed logs.
- Ensure MongoDB indexes are created before scheduling jobs. Agenda emits `ready` when the connection and indexes are ready.
- If using multiple processes, configure `lockLifetime` appropriately so jobs do not run more than once.
- For Azure CosmosDB use `sort: { nextRunAt: 1 }` to avoid the "Multiple order-by items" error.

## Frequently Asked Questions

### What order do jobs run in?

Jobs run in a first in first out order sorted by `nextRunAt` and `priority` (higher priority first). The default sort is `{ nextRunAt: 1, priority: -1 }`.

### What is the difference between `lockLimit` and `maxConcurrency`?

`lockLimit` controls how many jobs can be locked in the database at once. `maxConcurrency` controls how many running jobs Agenda will execute concurrently. Tune both when running multiple Agenda instances to avoid uneven load.

### Does Agenda have a web interface?

Agenda itself does not include a UI, but the community project [Agendash](https://github.com/agenda/agendash) provides one.

### Why does Agenda use Mongo instead of Redis?

Agenda prioritizes data persistence. MongoDB provides durability without special configuration, whereas Redis often requires extra setup to guarantee persistence. If a Redis driver is desired, the maintainers are open to contributions.

### Can Agenda run across multiple processes?

Yes. Agenda uses a locking mechanism so multiple processes or machines can work from the same job queue. Configure `lockLifetime` to prevent jobs from running more than once if a process crashes.

### Where can I get help or report issues?

Open issues on the [GitHub project](https://github.com/agenda/agenda/issues) or join the community Slack (link in the repository README).

---

This document provides a high level overview. Refer to the API documentation in the `docs/agenda` folder or the main `README.md` for additional details.
