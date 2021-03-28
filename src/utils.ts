import * as fs from 'fs'

const parse = require('csv-parse/lib/sync')
const iconv = require('iconv-lite')

const COUNTRY_ID = 'Country'

export type OrderedData = {
    byParty: Record<string, number>;
    byPlace: Array<string>
}

export type VotingData = {
    voters: number;
    totalVotes: number;
    disqualified: number;
    validVotes: number;
    votes: Record<string, number>;
    ordered: OrderedData
}

export type SingleBallotData = VotingData & {
    municipalityName: string;
    municipalityId: string;
    ballotId: string;
}

export type CumulativeBallotData = VotingData & {
    id: string;
}

export type ElectionsData = {
    ballots: Array<SingleBallotData>;
    byBallot: Record<string, CumulativeBallotData>;
    byBallotGroup: Record<string, CumulativeBallotData>;
    byMunicipality: Record<string, CumulativeBallotData>;
    totals: CumulativeBallotData;
}

export function readElections (file: string): ElectionsData {
  const ballots = readBallots(file)
  const byBallot = accumulateBy(ballots, b => `${b.municipalityId}/${b.ballotId}`)
  const byBallotGroup = accumulateBy(ballots, b => {
    let ballotId = b.ballotId
    const firstPeriod = ballotId.indexOf('.')
    if (firstPeriod > 0) {
      ballotId = ballotId.substring(0, firstPeriod)
    }
    return `${b.municipalityId}/${ballotId}`
  })
  const byMunicipality = accumulateBy(ballots, b => `${b.municipalityId}`)
  const totals = accumulateBy(ballots, () => COUNTRY_ID)[COUNTRY_ID]
  return {
    ballots,
    byBallot,
    byBallotGroup,
    byMunicipality,
    totals
  }
}

/**
 * Read csv data
 * @param file file to read from (either local of s3)
 * @returns array of rows (key=value map) in CSV file
 */
export function readBallots (file: string): Array<SingleBallotData> {
  // Read CSV file as binary
  const buffer = fs.readFileSync(file, { encoding: 'binary' })

  // Convert line 0 from ISO-8859-8 to standard UTF
  const contents = buffer.toString()
  const lines = contents.split('\n').map(l => iconv.decode(l, 'ISO-8859-8'))
  const sBuffer = Buffer.from(lines.join('\n'), 'utf8')

  // Parse the CSV
  const result: Array<string[]> = parse(sBuffer, { trim: true })
  const columnNames: string[] = result.shift()!
  // Remove empty header columns
  while (columnNames[columnNames.length - 1] === '') {
    columnNames.pop()
  }
  return result.map((r: any) => processLine(r, columnNames))
}

function sortVotes (votes: Record<string, number>): OrderedData {
  const byParty: Record<string, number> = {}
  const byPlace: string[] = []
  Object.keys(votes).sort((v1, v2) => votes[v2] - votes[v1]).forEach((v, i) => {
    byParty[v] = i
    byPlace.push(v)
  })
  return { byParty, byPlace }
}

function processLine (line: string[], columnNames: string[]): SingleBallotData {
  const ballotVotes: Record<string, number> = {}
  for (let i = 11; i < columnNames.length; i++) {
    ballotVotes[columnNames[i]] = parseInt(line[i])
  }
  return {
    municipalityName: line[2],
    municipalityId: line[3],
    ballotId: line[4],
    voters: parseInt(line[7]),
    totalVotes: parseInt(line[8]),
    disqualified: parseInt(line[9]),
    validVotes: parseInt(line[10]),
    votes: ballotVotes,
    ordered: sortVotes(ballotVotes)
  }
}

export function accumulateBy (ballots: Array<SingleBallotData>, idFunc: (b: SingleBallotData) => string): Record<string, CumulativeBallotData> {
  // Group by ID
  const byId = ballots.reduce((prev: any, cur: SingleBallotData) => {
    const id = idFunc(cur)
    const ballots = prev[id] || []
    ballots.push(cur)
    prev[id] = ballots
    return prev
  }, {})

  // Accumulate votes by ID
  const accumulations: Record<string, CumulativeBallotData> = {}
  Object.keys(byId).forEach(k => {
    const ballots: Array<SingleBallotData> = byId[k]
    const cumulate: CumulativeBallotData = {
      id: k,
      voters: 0,
      validVotes: 0,
      disqualified: 0,
      totalVotes: 0,
      votes: {},
      ordered: { byPlace: [], byParty: {} }
    }
    ballots.forEach(b => addVotingData(b, cumulate))
    accumulations[k] = cumulate
  })

  for (const k in accumulations) {
    if (Object.prototype.hasOwnProperty.call(accumulations, k)) {
      accumulations[k].ordered = sortVotes(accumulations[k].votes)
    }
  }

  return accumulations
}

export function addVotingData (cur: SingleBallotData, cumulate: CumulativeBallotData) {
  cumulate.disqualified += cur.disqualified
  cumulate.totalVotes += cur.totalVotes
  cumulate.validVotes += cur.validVotes
  cumulate.voters += cur.voters
  const parties = Object.keys(cur.votes)
  parties.forEach(p => {
    cumulate.votes[p] = (cumulate.votes[p] || 0) + (cur.votes[p] || 0)
  })
}
