import {parseHBML} from "./old_parser.js";

const test = ":root { head {} body { h1 > 'tests' }}";
console.log(parseHBML(test));
