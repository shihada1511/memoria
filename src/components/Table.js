import React from 'react';
import './Table.css';

const Table = ({ columns, rows, emptyMessage }) => {
  if (!rows || rows.length === 0) {
    return (
      <p className="memoria-table-empty">
        <span className="memoria-table-empty-icon" aria-hidden="true">🗒️</span>
        {emptyMessage || 'No data to display.'}
      </p>
    );
  }

  return (
    <div className="memoria-table-wrapper">
      <table className="memoria-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
