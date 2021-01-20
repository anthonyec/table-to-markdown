const fs = require('fs');
const HtmlTableToJson = require('html-table-to-json');
const TurndownService = require('turndown');

const html = fs.readFileSync('./input.html', 'utf8');

class HtmlTableToJsonMod extends HtmlTableToJson {
  constructor(html, opts) {
    super(html, opts);
  }

  static parse(html, opts) {
    return new HtmlTableToJsonMod(html, opts);
  }

  // Override _processRow to have option to not parse specfic HTML nodes
  _processRow(tableIndex, index, row) {
    if (index === 0 && this._firstRowUsedAsHeaders[tableIndex] === true) return

    this._results[tableIndex][index] = {}

    this._$(row).find('td').each((i, cell) => {
      const method = this.opts.avoidDecoding && this.opts.avoidDecoding.includes(this._headers[tableIndex][i]) ? 'html' : 'text';
      this._results[tableIndex][index][this._headers[tableIndex][i] || (i + 1)] = this._$(cell)[method]().trim()
    })
  }
}

const turndownService = new TurndownService();
const jsonTables = HtmlTableToJsonMod.parse(html, {
  avoidDecoding: [
    'Todo Mitigation(s)',
    'Rejected Mitigation(s)',
    'Current Mitigation(s)'
  ]
});

function list(str, bullet = '- ') {
  return str.split('\n')
    .filter(item => item.trim())
    .map(item => item.trim())
    .map(item => `${bullet}${item}`)
    .join('\n');
}

const serverityHeading = jsonTables._headers[0][3];
const likelihoodHeading = jsonTables._headers[0][4];
const riskHeading = jsonTables._headers[0][5];

const output = jsonTables.results[0].map((result) => {
  const formatted = `
## ${result.Name.trim()}

**Description:**

${list(result.Description.trim()) || '- None'}

**Current Mitigation(s):**

${turndownService.turndown(result['Current Mitigation(s)']) || '- None'}

**Todo Mitigation(s):**

${turndownService.turndown(result['Todo Mitigation(s)']) || '- None'}

**Rejected Mitigation(s):**

${turndownService.turndown(result['Rejected Mitigation(s)']) || '- None'}


| Classifications | Severity | Likelihood | Risk |
|---|---|---|---|
| ${result['Classifications'] } | ${result[serverityHeading]} | ${result[likelihoodHeading]} | ${result[riskHeading]} |

`;

  return formatted.trim();
}).join('\n')
  .replace(/\-\s\-/g, '') // Remove double bullets
  .replace(/Closed/g, '') // Remove "Closed" from inline tickets
  .replace(/Open/g, ''); // Remove "Open" from inline tickets

fs.writeFileSync('./output.md', output, 'utf8');
