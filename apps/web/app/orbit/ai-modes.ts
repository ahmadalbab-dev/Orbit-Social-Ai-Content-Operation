export const AI_MODES={caption:"Caption",ideas:"Content ideas",rewrite:"Rewrite",hashtags:"Hashtags",script:"Video script"} as const;
export type AiMode=keyof typeof AI_MODES;
