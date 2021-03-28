import { ElectionsData, readElections, SingleBallotData } from './utils'

// const prevResults = readElections('./resources/2020_03_02/expb.csv')
const results = readElections('./resources/2021_03_23/expb.csv')
const report = detectSuspiciousBallotsByTotalResults(results)
console.log(report)

function detectSuspiciousBallotsByTotalResults (results: ElectionsData): string {
  const loss: Record<string, number> = {}
  const gain: Record<string, number> = {}
  let report = 'Location,Location ID,Ballot ID,Number of Votes,Counted As,Should Be\n'
  results.ballots.forEach(b => {
    for (let i = 0; i < 3; i++) {
      const ballotNthParty = b.ordered.byPlace[i]
      const nationalPositionOfParty = results.totals.ordered.byParty[ballotNthParty]
      const voteCount = b.votes[ballotNthParty]
      if (nationalPositionOfParty > 12 + i && voteCount > 2) {
        // See if there's a nationally high-ranked party that didn't receive any votes here...
        const partiesWithZeroVotes: string[] = []
        for (let i = 0; i < 4; i++) {
          const nationalPartyAtN = results.totals.ordered.byPlace[i]
          if (b.votes[nationalPartyAtN] === 0) {
            partiesWithZeroVotes.push(nationalPartyAtN)
          }
        }

        if (partiesWithZeroVotes.length === 0) {
          console.log(`Ballot ${id(b)} (${b.municipalityName}): ${party(ballotNthParty)} is in position ${i + 1} (${voteCount} votes) but nationally at position ${nationalPositionOfParty}`)
        } else {
          console.log(`Ballot ${id(b)} (${b.municipalityName}): votes potentially recorded to ${party(ballotNthParty)} (${voteCount} votes) instead of ${partiesWithZeroVotes} (with 0 votes)`)
          if (partiesWithZeroVotes.length === 1 && voteCount > 10) {
            report += `${b.municipalityName},${b.municipalityId},${b.ballotId},${voteCount},${ballotNthParty},${partiesWithZeroVotes[0]}\n`
          }
        }

        loss[ballotNthParty] = (loss[ballotNthParty] || 0) + voteCount
        partiesWithZeroVotes.forEach(p => {
          gain[p] = (gain[p] || 0) + voteCount
        })
      }
    }
  })

  /* Object.keys(loss).forEach(k => {
        console.log(`${party(k)} loses: ${loss[k]}`);
    });
    Object.keys(gain).forEach(k => {
        console.log(`${party(k)} gains: ${gain[k]}`);
    }); */

  return report
}

function id (b: SingleBallotData) {
  return `${b.municipalityId}/${b.ballotId}`
}

function party (id: string): string {
  return id
}
