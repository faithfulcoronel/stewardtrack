import { Container } from 'inversify';
import { TYPES } from './types';
import { RbacService } from '@/services/rbac.service';
import { RbacRepository } from '@/repositories/rbac.repository';
import { RbacRegistryService } from '@/services/RbacRegistryService';

const container = new Container();

// RBAC Services
container.bind<RbacService>(TYPES.RbacService).to(RbacService);
container.bind<RbacRepository>(TYPES.RbacRepository).to(RbacRepository);
container.bind<RbacRegistryService>(TYPES.RbacRegistryService).to(RbacRegistryService);

export { container };