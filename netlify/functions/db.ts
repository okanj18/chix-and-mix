import { connect } from '@netlify/db';

export const db = connect({
  tableName: 'app_data',
});