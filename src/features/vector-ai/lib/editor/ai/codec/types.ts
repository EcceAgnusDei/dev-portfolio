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

export type CompactPath = ["p", string, string, number?];

export type CompactShape =
  | CompactRect
  | CompactCircle
  | CompactLine
  | CompactText
  | CompactPath;

export type VectorAiAddOp = ["add", CompactShape];
export type VectorAiUpdateOp = ["update", CompactShape];
export type VectorAiDeleteOp = ["delete", string];

export type VectorAiOp =
  | VectorAiAddOp
  | VectorAiUpdateOp
  | VectorAiDeleteOp;

export type VectorAiLlmResponse = {
  ops: VectorAiOp[];
  message?: string;
};

export type LlmDocContext = {
  vb: [number, number, number, number];
  s: CompactShape[];
};

export type IdMap = {
  shortToReal: ReadonlyMap<string, string>;
  realToShort: ReadonlyMap<string, string>;
};
