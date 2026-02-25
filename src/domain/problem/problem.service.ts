import problems from "./problems.json" with {type: 'json'}
import  type {Problem}  from "./problem.types.ts";

export class ProblemService {
  private readonly problemSet: Problem[];

  constructor() {
    this.problemSet = problems;
  }

  getProblemSet(): Problem[] {
    return this.problemSet.slice(0, 3);
  }

  getProblemById(id: string): Problem | undefined {
    return this.problemSet.find(p => p.id === id);
  }
}
