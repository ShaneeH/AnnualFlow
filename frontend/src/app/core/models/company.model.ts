export interface Company {

    companyId: number;

    companyName: string;

    // True for seeded fictional demo data (npm run db:seed:demo).
    isDemo?: boolean;

}