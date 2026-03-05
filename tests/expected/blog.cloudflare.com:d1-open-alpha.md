```json
{
  "title": "UPDATE Supercloud SET status = 'open alpha' WHERE product = 'D1';",
  "author": "Nevi Shah, Glen Maddern, Sven Sauleau, Abe Carryl, James M Snell, Steve Faulkner, Matt Carey",
  "site": "The Cloudflare Blog",
  "published": "2022-11-16T14:01:00.000+00:00"
}
```

2022-11-16

4 min read

This post is also available in [简体中文](https://blog.cloudflare.com/zh-cn/d1-open-alpha), [Español](https://blog.cloudflare.com/es-es/d1-open-alpha) and [日本語](https://blog.cloudflare.com/ja-jp/d1-open-alpha).

![UPDATE Supercloud SET status = 'open alpha' WHERE product = 'D1';](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/7w9UvQOVgrNbxPrz1tOWJz/611cdc1253d0c6971709f5dddacc0811/image1-48.png)

In May 2022, we [announced](https://blog.cloudflare.com/introducing-d1/) our quest to simplify databases – building them, maintaining them, integrating them. Our goal is to empower you with the tools to run a database that is powerful, scalable, with world-beating performance without any hassle. And we first set our sights on reimagining the database development experience for every type of user – not just database experts.

Over the past couple of months, we’ve [been working](https://blog.cloudflare.com/whats-new-with-d1/) to create just that, while learning some very important lessons along the way. As it turns out, building a global relational database product on top of Workers pushes the boundaries of the developer platform to their absolute limit, and often beyond them, but in a way that’s absolutely thrilling to us at Cloudflare. It means that while our progress might seem slow from outside, every improvement, bug fix or stress test helps lay down a path for *all* of our customers to build the world’s most [ambitious serverless application](https://blog.cloudflare.com/welcome-to-the-supercloud-and-developer-week-2022/).

However, as we continue down the road to making D1 production ready, it wouldn’t be “the Cloudflare way” unless we stopped for feedback first – even though it’s not *quite* finished yet. In the spirit of Developer Week, **there is no better time to introduce the D1 open alpha**!

An “open alpha” is a new concept for us. You'll likely hear the term “open beta” on various announcements at Cloudflare, and while it makes sense for many products here, it wasn’t quite right for D1. There are still some crucial pieces that are still in active development and testing, so before we release the fully-formed D1 as a public beta for you to start building real-world apps with, we want to make sure everybody can start to get a feel for the product on their hobby apps or side-projects.

## What’s included in the alpha?

While a lot is still changing behind the scenes with D1, we’ve put a lot of thought into how you, as a developer, interact with it – even if you’re new to databases.

### Using the D1 dashboard

In a few clicks you can get your D1 database up and running right from within your dashboard. In our D1 interface, you can create, maintain and view your database as you please. Changes made in the UI are instantly available to your Worker - no redeploy required!

![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/6vOzmnP9cvUYbJanSvprvl/b4a01d4edcc3dcada5a326e352b5f0e2/image2-30.png)

### Use Wrangler

If you’re looking to get your hands a little dirty, you can also work with your database using our Wrangler CLI. Create your database and begin adding your data manually or bootstrap your database with one of two ways:

**1\. Execute an SQL file**

```sh
$ wrangler d1 execute my-database-name --file ./customers.sql
```

where your `.sql` file looks something like this:

customers.sql

```sql
DROP TABLE IF EXISTS Customers;
CREATE TABLE Customers (CustomerID INT, CompanyName TEXT, ContactName TEXT, PRIMARY KEY (\`CustomerID\`));
INSERT INTO Customers (CustomerID, CompanyName, ContactName) 
VALUES (1, 'Alfreds Futterkiste', 'Maria Anders'),(4, 'Around the Horn', 'Thomas Hardy'),(11, 'Bs Beverages', 'Victoria Ashworth'),(13, 'Bs Beverages', 'Random Name');
```

**2\. Create and run migrations**

Migrations are a way to version your database changes. With D1, you can [create a migration](https://developers.cloudflare.com/d1/migrations/) and then apply it to your database.

To create the migration, execute:

```sh
wrangler d1 migrations create <my-database-name> <short description of migration>
```

This will create an SQL file in a `migrations` folder where you can then go ahead and add your queries. Then apply the migrations to your database by executing:

```sh
wrangler d1 migrations apply <my-database-name>
```

### Access D1 from within your Worker

You can attach your D1 to a Worker by adding the D1 binding to your `wrangler.toml` configuration file. Then interact with D1 by executing queries inside your Worker like so:

```js
export default {
 async fetch(request, env) {
   const { pathname } = new URL(request.url);

   if (pathname === "/api/beverages") {
     const { results } = await env.DB.prepare(
       "SELECT * FROM Customers WHERE CompanyName = ?"
     )
       .bind("Bs Beverages")
       .all();
     return Response.json(results);
   }

   return new Response("Call /api/beverages to see Bs Beverages customers");
 },
};
```

### Or access D1 from within your Pages Function

In this Alpha launch, D1 also supports integration with [Cloudflare Pages](https://pages.cloudflare.com/)! You can add a D1 binding inside the Pages dashboard, and write your queries inside a Pages Function to build a full-stack application! Check out the [full documentation](https://developers.cloudflare.com/pages/platform/functions/bindings/#d1-database) to get started with Pages and D1.

## Community built tooling

During our private alpha period, the excitement behind D1 led to some valuable contributions to the D1 ecosystem and developer experience by members of the community. Here are some of our favorite projects to date:

### d1-orm

An Object Relational Mapping (ORM) is a way for you to query and manipulate data by using JavaScript. Created by a Cloudflare Discord Community Champion, the `d1-orm` seeks to provide a strictly typed experience while using D1:

```ts
const users = new Model(
    // table name, primary keys, indexes etc
    tableDefinition,
    // column types, default values, nullable etc
    columnDefinitions
)

// TS helper for typed queries
type User = Infer<type of users>;

// ORM-style query builder
const user = await users.First({
    where: {
        id: 1,
    },
});
```

You can check out the [full documentation](https://docs.interactions.rest/d1-orm/), and provide feedback by making an issue on the [GitHub repository](https://github.com/Interactions-as-a-Service/d1-orm/issues).

### workers-qb

This is a zero-dependency query builder that provides a simple standardized interface while keeping the benefits and speed of using raw queries over a traditional ORM. While not intended to provide ORM-like functionality, `workers-qb` makes it easier to interact with the database from code for direct SQL access:

```js
const qb = new D1QB(env.DB)

const fetched = await qb.fetchOne({
  tableName: 'employees',
  fields: 'count(*) as count',
  where: {
    conditions: 'department = ?1',
    params: ['HQ'],
  },
})
```

You can read more about the query builder [here](https://workers-qb.massadas.com/).

### d1-console

Instead of running the `wrangler d1 execute` command in your terminal every time you want to interact with your database, you can interact with D1 from within the `d1-console`. Created by a Discord Community Champion, this gives the benefit of executing multi-line queries, obtaining command history, and viewing a cleanly formatted table output.

![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4QR9Tf5DXnp3brBVvlvgJq/7f5b5083198492190dfc9f24e4fb70e0/image3-23.png)

While this is a community project today, we plan to natively support a “D1 Console” in the future. For now, get started by checking out the `d1-console` package [here](https://github.com/isaac-mcfadyen/d1-console).

### D1 adapter for Kysely

Kysely is a type-safe and autocompletion-friendly typescript SQL query builder. With this adapter you can interact with D1 with the familiar Kysely interface:

```ts
// Create Kysely instance with kysely-d1
const db = new Kysely<Database>({ 
  dialect: new D1Dialect({ database: env.DB })
});
    
// Read row from D1 table
const result = await db
  .selectFrom('kv')
  .selectAll()
  .where('key', '=', key)
  .executeTakeFirst();
```

Check out the project [here](https://github.com/aidenwallis/kysely-d1).

## What’s still in testing?

The biggest pieces that have been disabled for this alpha release are replication and JavaScript transaction support. While we’ll be rolling out these changes gradually, we want to call out some limitations that exist today that we’re actively working on testing:

- **Database location:** Each D1 database only runs a single instance. It’s created close to where you, as the developer, create the database, and does not currently move regions based on access patterns. Workers running elsewhere in the world will see higher latency as a result.
- **Concurrency limitations:** Under high load, read and write queries may be queued rather than triggering new replicas to be created. As a result, the performance & throughput characteristics of the open alpha won’t be representative of the final product.
- **Availability limitations:** Backups will block access to the DB while they’re running. In most cases this should only be a second or two, and any requests that arrive during the backup will be queued.

You can also check out a more detailed, up-to-date list on [D1 alpha Limitations](https://developers.cloudflare.com/d1/platform/limits/).

While we can make all sorts of guesses and bets on the kind of databases you want to use D1 for, we are not the users – you are! We want developers from all backgrounds to preview the D1 tech at its early stages, and let us know where we need to improve to make it suitable for your production apps.

For general feedback about your experience and to interact with other folks in the alpha, join our [#d1-open-alpha](https://discord.com/channels/595317990191398933/992060581832032316) channel in the [Cloudflare Developers Discord](https://discord.gg/cloudflaredev). We plan to make any important announcements and changes in this channel as well as on our [monthly community calls](https://discord.com/channels/595317990191398933/832698219824807956).

To file more specific feature requests (no matter how wacky) and report any bugs, create a thread in the [Cloudflare Community forum](https://community.cloudflare.com/c/developers/d1) under the D1 category. We will be maintaining this forum as a way to plan for the months ahead!

## Get started

Want to get started right away? Check out our [D1 documentation](https://developers.cloudflare.com/d1/) to get started today. [Build](https://github.com/cloudflare/d1-northwind) our classic [Northwind Traders demo](https://northwind.d1sql.com/) to explore the D1 experience and deploy your first D1 database!

Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).  
  
Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.  
  
To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).