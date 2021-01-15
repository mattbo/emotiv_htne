import React from 'react';

const Results = ({results}) => {
  // results is an array of messages; display each one
  return ( <div>
    <h3>Results will appear below:</h3>
    <ul>
      {results.map(msg => (
          <li>{msg}</li>
      ))}
    </ul>
    </div>
  )
}

const ResultsTable = ({rows}) => {
  // rows is an array, each row contains a channel and a value
  if (!rows || rows.length === 0) {
      return (<div> Waiting for data... </div>);
  }
  return (
    <table>
      <thead><tr>
        <th>Channel</th>
        <th>Value</th>
      </tr></thead>
      <tbody>
      {rows.map(row => (
          <tr key={row.channel}>
              <td>{row.channel}</td>
              <td>{row.value}</td>
          </tr>
      ))}
      </tbody>
    </table>
  )
}

export {ResultsTable, Results};
