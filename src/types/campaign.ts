export interface User {
    id: string,
    name: string,
    email: string
}

export interface Campaign
{
    id?: string,
    name: string,
    description: string,
    createdAt?: string,
    updatedAt?: string,
    ownerId?: string
    users: User[]
}

export interface CampaignMapRoutingMember {
    userId: string;
    currentMapId: string | null;
    user: User;
}

export interface CampaignMapRouting {
    campaignId: string;
    isOwner: boolean;
    members: CampaignMapRoutingMember[];
}
