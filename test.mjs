#!/usr/bin/env node
"use strict";

import {readFileSync, writeFileSync} from "fs";
import SubripText from "./srt.mjs";

const input = readFileSync("Predators (2010).srt", "utf8");
let a = new SubripText(input);
a.offset(1 * 1000);
writeFileSync("Predators (2010).srt", a.toString());
