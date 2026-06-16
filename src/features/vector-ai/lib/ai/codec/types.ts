export type CompactRect = [
  "r",
  string,
  number,
  number,
  number,
  number,
  string,
  string?,
  number?,
];

export type CompactCircle = [
  "c",
  string,
  number,
  number,
  number,
  string,
  string?,
  number?,
];

export type CompactLine = [
  "l",
  string,
  number,
  number,
  number,
  number,
  string,
  number?,
];

export type CompactText = [
  "t",
  string,
  number,
  number,
  string,
  number,
  string,
];

export type CompactShape =
  | CompactRect
  | CompactCircle
  | CompactLine
  | CompactText;

export type VectorAiAddOp = ["add", CompactShape];
export type VectorAiClearOp = ["clear"];

export type VectorAiOp = VectorAiAddOp | VectorAiClearOp;

export type LlmDocContext = {
  vb: [number, number, number, number];
  s: CompactShape[];
  pathCount: number;
};

export type IdMap = {
  shortToReal: ReadonlyMap<string, string>;
  realToShort: ReadonlyMap<string, string>;
};
