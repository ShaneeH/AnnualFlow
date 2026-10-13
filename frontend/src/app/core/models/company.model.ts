export interface Company {

    companyId: number;

    companyName: string;

<<<<<<< HEAD
=======
    // True for the seeded fictional example dataset (npm run db:seed:example).
    isExample?: boolean;

    // True for the signed-in user's own companies; false for public data.
    isOwned?: boolean;

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
}