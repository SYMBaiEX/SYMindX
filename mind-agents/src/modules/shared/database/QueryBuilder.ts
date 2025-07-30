/**
 * Query Builder for SYMindX
 *
 * Provides safe SQL query construction for all database types
 */

export interface QueryCondition {
  field: string;
  operator:
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'LIKE'
    | 'IN'
    | 'NOT IN'
    | 'IS NULL'
    | 'IS NOT NULL';
  value?: any;
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
}

export class QueryBuilder {
  private selectFields: string[] = ['*'];
  private tableName: string;
  private conditions: QueryCondition[] = [];
  private joins: JoinClause[] = [];
  private groupByFields: string[] = [];
  private orderByFields: Array<{ field: string; direction: 'ASC' | 'DESC' }> =
    [];
  private limitValue?: number;
  private offsetValue?: number;
  private isDistinct = false;

  constructor(table: string) {
    this.tableName = table;
  }

  /**
   * Select specific fields
   */
  select(...fields: string[]): this {
    this.selectFields = fields.length > 0 ? fields : ['*'];
    return this;
  }

  /**
   * Add DISTINCT to query
   */
  distinct(): this {
    this.isDistinct = true;
    return this;
  }

  /**
   * Add WHERE condition
   */
  where(
    field: string,
    operator: QueryCondition['operator'],
    value?: any
  ): this {
    this.conditions.push({ field, operator, value });
    return this;
  }

  /**
   * Add WHERE condition with AND
   */
  andWhere(
    field: string,
    operator: QueryCondition['operator'],
    value?: any
  ): this {
    return this.where(field, operator, value);
  }

  /**
   * Add JOIN clause
   */
  join(type: JoinClause['type'], table: string, on: string): this {
    this.joins.push({ type, table, on });
    return this;
  }

  /**
   * Add INNER JOIN
   */
  innerJoin(table: string, on: string): this {
    return this.join('INNER', table, on);
  }

  /**
   * Add LEFT JOIN
   */
  leftJoin(table: string, on: string): this {
    return this.join('LEFT', table, on);
  }

  /**
   * Add GROUP BY
   */
  groupBy(...fields: string[]): this {
    this.groupByFields = fields;
    return this;
  }

  /**
   * Add ORDER BY
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByFields.push({ field, direction });
    return this;
  }

  /**
   * Set LIMIT
   */
  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  /**
   * Set OFFSET
   */
  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  /**
   * Build SELECT query
   */
  buildSelect(): { sql: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 1;

    // SELECT clause
    let sql = 'SELECT ';
    if (this.isDistinct) sql += 'DISTINCT ';
    sql += this.selectFields.join(', ');
    sql += ` FROM ${this.tableName}`;

    // JOIN clauses
    for (const join of this.joins) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // WHERE clause
    if (this.conditions.length > 0) {
      sql += ' WHERE ';
      const whereClauses = this.conditions.map((condition) => {
        if (
          condition.operator === 'IS NULL' ||
          condition.operator === 'IS NOT NULL'
        ) {
          return `${condition.field} ${condition.operator}`;
        }

        if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
          const placeholders = (condition.value as any[])
            .map(() => `$${paramIndex++}`)
            .join(', ');
          params.push(...(condition.value as any[]));
          return `${condition.field} ${condition.operator} (${placeholders})`;
        }

        params.push(condition.value);
        return `${condition.field} ${condition.operator} $${paramIndex++}`;
      });
      sql += whereClauses.join(' AND ');
    }

    // GROUP BY clause
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    // ORDER BY clause
    if (this.orderByFields.length > 0) {
      sql += ' ORDER BY ';
      sql += this.orderByFields
        .map((order) => `${order.field} ${order.direction}`)
        .join(', ');
    }

    // LIMIT and OFFSET
    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }
    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params };
  }

  /**
   * Build INSERT query
   */
  buildInsert(data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const params = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    return { sql, params };
  }

  /**
   * Build UPDATE query
   */
  buildUpdate(data: Record<string, any>): { sql: string; params: any[] } {
    const fields = Object.keys(data);
    const params: any[] = Object.values(data);
    let paramIndex = 1;

    const setClauses = fields
      .map((field) => {
        return `${field} = $${paramIndex++}`;
      })
      .join(', ');

    let sql = `UPDATE ${this.tableName} SET ${setClauses}`;

    // WHERE clause
    if (this.conditions.length > 0) {
      sql += ' WHERE ';
      const whereClauses = this.conditions.map((condition) => {
        if (
          condition.operator === 'IS NULL' ||
          condition.operator === 'IS NOT NULL'
        ) {
          return `${condition.field} ${condition.operator}`;
        }
        params.push(condition.value);
        return `${condition.field} ${condition.operator} $${paramIndex++}`;
      });
      sql += whereClauses.join(' AND ');
    }

    sql += ' RETURNING *';

    return { sql, params };
  }

  /**
   * Build DELETE query
   */
  buildDelete(): { sql: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 1;

    let sql = `DELETE FROM ${this.tableName}`;

    // WHERE clause
    if (this.conditions.length > 0) {
      sql += ' WHERE ';
      const whereClauses = this.conditions.map((condition) => {
        if (
          condition.operator === 'IS NULL' ||
          condition.operator === 'IS NOT NULL'
        ) {
          return `${condition.field} ${condition.operator}`;
        }
        params.push(condition.value);
        return `${condition.field} ${condition.operator} $${paramIndex++}`;
      });
      sql += whereClauses.join(' AND ');
    }

    return { sql, params };
  }

  /**
   * Build COUNT query
   */
  buildCount(): { sql: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 1;

    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    // JOIN clauses
    for (const join of this.joins) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // WHERE clause
    if (this.conditions.length > 0) {
      sql += ' WHERE ';
      const whereClauses = this.conditions.map((condition) => {
        if (
          condition.operator === 'IS NULL' ||
          condition.operator === 'IS NOT NULL'
        ) {
          return `${condition.field} ${condition.operator}`;
        }

        if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
          const placeholders = (condition.value as any[])
            .map(() => `$${paramIndex++}`)
            .join(', ');
          params.push(...(condition.value as any[]));
          return `${condition.field} ${condition.operator} (${placeholders})`;
        }

        params.push(condition.value);
        return `${condition.field} ${condition.operator} $${paramIndex++}`;
      });
      sql += whereClauses.join(' AND ');
    }

    return { sql, params };
  }

  /**
   * Create a new QueryBuilder instance
   */
  static from(table: string): QueryBuilder {
    return new QueryBuilder(table);
  }

  /**
   * Escape identifier (table/column name)
   */
  static escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Escape value for safe insertion
   */
  static escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    // String values
    return `'${String(value).replace(/'/g, "''")}'`;
  }
}
