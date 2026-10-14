export interface Company {

    companyId: number;

    companyName: string;

    // True for the seeded fictional example dataset (npm run db:seed:example).
    isExample?: boolean;

    // True for the signed-in user's own companies; false for public data.
    isOwned?: boolean;

}