import { DefuddleOptions, DefuddleResponse } from './types';
export type { DefuddleOptions, DefuddleResponse };
declare class Defuddle {
    private defuddle;
    private options;
    constructor(doc: Document, options?: DefuddleOptions);
    parse(): DefuddleResponse;
    parseAsync(): Promise<DefuddleResponse>;
}
export default Defuddle;
