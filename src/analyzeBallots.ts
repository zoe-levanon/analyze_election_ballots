import { accumulateBy, readElections } from "./utils";

const resultsPrev = readElections("./resources/2020_03_02/expb.csv");
//console.log("Read " + resultsPrev.length + " ballots from previous elections")
const results = readElections("./resources/2021_03_23/expb.csv");
//console.log("Read " + results.length + " ballots from current elections");

// const byMunicipality = accumulateBy(results, r => r.municipalityId);
// for (let k of Object.keys(byMunicipality)) {
//     console.log(k + ": " + byMunicipality[k].totalVotes);
// }
console.log(JSON.stringify(results.totals));