import { accumulateBy, readBallots } from "./utils";

const resultsPrev = readBallots("./resources/2020_03_02/expb.csv");
//console.log("Read " + resultsPrev.length + " ballots from previous elections")
const results = readBallots("./resources/2021_03_23/expb.csv");
//console.log("Read " + results.length + " ballots from current elections");

const byMunicipality = accumulateBy(results, r => r.municipalityId);
for (let k of Object.keys(byMunicipality)) {
    console.log(k + ": " + byMunicipality[k].length);
}