export interface Player {
  id: string;
  name: string;
}

export interface Round {
  id: string;
  courseName: string;
  date: string;
  holesCount: number;
  pars: Record<number, number>; // hole (1-9 or any) -> par score
  players: Player[];
  scores: Record<string, Record<number, number>>; // playerId -> holeIndex -> score
  completed: boolean;
}

export interface CourseTemplate {
  name: string;
  holesCount: number;
  pars: Record<number, number>;
}

