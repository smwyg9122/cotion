import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create inventory table
  const hasInventory = await knex.schema.hasTable('inventory');
  if (!hasInventory) {
    await knex.schema.createTable('inventory', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 200).notNullable();
      table.string('type', 20).notNullable(); // 'green' or 'roasted'
      table.string('origin', 100).nullable();
      table.string('variety', 100).nullable();
      table.string('process', 100).nullable();
      table.decimal('total_in', 10, 2).notNullable().defaultTo(0);
      table.decimal('current_stock', 10, 2).notNullable().defaultTo(0);
      table.string('storage_location', 200).nullable();
      table.string('workspace', 100).notNullable();
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['workspace'], 'idx_inventory_workspace');
    });
  }

  // Create inventory_transactions table
  const hasTransactions = await knex.schema.hasTable('inventory_transactions');
  if (!hasTransactions) {
    await knex.schema.createTable('inventory_transactions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('inventory_id').notNullable().references('id').inTable('inventory').onDelete('CASCADE');
      table.string('type', 10).notNullable(); // 'in' or 'out'
      table.decimal('quantity', 10, 2).notNullable();
      table.text('note').nullable();
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['inventory_id'], 'idx_inventory_transactions_inventory_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inventory_transactions');
  await knex.schema.dropTableIfExists('inventory');
}
