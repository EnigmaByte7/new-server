export interface Problem {
  id: string;
  title: string;
  description: string;
  driverCode: string;
  constraints: string;
  testCases: {
    input: string;
    output: string;
  }[];
}
