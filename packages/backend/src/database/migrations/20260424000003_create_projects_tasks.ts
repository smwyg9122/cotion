import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create projects table
  const hasProjects = await knex.schema.hasTable('projects');
  if (!hasProjects) {
    await knex.schema.createTable('projects', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 200).notNullable();
      table.text('description').nullable();
      table.string('status', 20).notNullable().defaultTo('active');
      table.string('workspace', 100).notNullable();
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['workspace'], 'idx_projects_workspace');
    });
  }

  // Create tasks table
  const hasTasks = await knex.schema.hasTable('tasks');
  if (!hasTasks) {
    await knex.schema.createTable('tasks', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
      table.string('title', 300).notNullable();
      table.text('description').nullable();
      table.string('status', 20).notNullable().defaultTo('todo');
      table.string('priority', 10).notNullable().defaultTo('medium');
      table.integer('position').notNullable().defaultTo(0);
      table.timestamp('due_date').nullable();
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['project_id'], 'idx_tasks_project_id');
      table.index(['status'], 'idx_tasks_status');
    });
  }

  // Create task_assignees junction table
  const hasTaskAssignees = await knex.schema.hasTable('task_assignees');
  if (!hasTaskAssignees) {
    await knex.schema.createTable('task_assignees', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.unique(['task_id', 'user_id'], { indexName: 'uq_task_assignees_task_user' });
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('task_assignees');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('projects');
}
