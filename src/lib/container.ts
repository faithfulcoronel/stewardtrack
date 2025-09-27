import { Container } from 'inversify';
import { TYPES } from './types';
import { RbacService } from '@/services/rbac.service';
import { RbacRepository } from '@/repositories/rbac.repository';
import { RbacRegistryService } from '@/services/RbacRegistryService';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { UserMemberLinkRepository } from '@/repositories/userMemberLink.repository';
import { MemberInvitationRepository } from '@/repositories/memberInvitation.repository';

const container = new Container();

// RBAC Services
container.bind<RbacService>(TYPES.RbacService).to(RbacService);
container.bind<RbacRepository>(TYPES.RbacRepository).to(RbacRepository);
container.bind<RbacRegistryService>(TYPES.RbacRegistryService).to(RbacRegistryService);

// User Member Link Services
container.bind<UserMemberLinkService>(TYPES.UserMemberLinkService).to(UserMemberLinkService);
container.bind<UserMemberLinkRepository>(TYPES.UserMemberLinkRepository).to(UserMemberLinkRepository);
container.bind<MemberInvitationRepository>(TYPES.MemberInvitationRepository).to(MemberInvitationRepository);

export { container };