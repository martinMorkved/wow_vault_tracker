export type CharacterInput = {
  id: string;
  region: string;
  realm: string;
  name: string;
};

export type CharacterResult = {
  character: {
    name: string;
    realm: string;
    region: string;
    className: string;
    specName: string;
    thumbnailUrl: string;
    profileUrl: string;
  };
  resetAtUtc: string;
  nextResetAtUtc: string;
  regionLabel: string;
  weeklyRunCount: number;
  weeklyTenPlusCount: number;
  vault: {
    one: boolean;
    four: boolean;
    eight: boolean;
    missingForOne: number;
    missingForFour: number;
    missingForEight: number;
  };
  recentRuns: {
    dungeon: string;
    mythic_level: number;
    completed_at: string;
  }[];
};
