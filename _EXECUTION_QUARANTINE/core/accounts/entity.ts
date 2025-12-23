/**
 * Entity Abstraction
 * 
 * PHASE 7: Account & Entity Abstraction
 * 
 * Lightweight representation of ownership/control.
 * Entities can own one or more accounts.
 * 
 * This is mostly metadata for now - future-proofing for multi-entity scenarios.
 */

export interface Entity {
  entityId: string; // Unique identifier
  displayName: string; // Human-readable name
  accountIds: string[]; // List of owned account IDs
  createdAt: Date;
  metadata?: Record<string, any>; // Future extensibility
}

/**
 * Entity Manager
 * 
 * Manages entity lifecycle and account ownership.
 */
export class EntityManager {
  private entities: Map<string, Entity> = new Map();

  /**
   * Create a new entity
   */
  createEntity(entityId: string, displayName: string, metadata?: Record<string, any>): Entity {
    if (this.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} already exists`);
    }

    const entity: Entity = {
      entityId,
      displayName,
      accountIds: [],
      createdAt: new Date(),
      metadata
    };

    this.entities.set(entityId, entity);
    console.log(`[ENTITY_MANAGER] Created entity: ${entityId} (${displayName})`);

    return entity;
  }

  /**
   * Get entity by ID
   */
  getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Add account to entity
   */
  addAccountToEntity(entityId: string, accountId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    if (!entity.accountIds.includes(accountId)) {
      entity.accountIds.push(accountId);
      console.log(`[ENTITY_MANAGER] Added account ${accountId} to entity ${entityId}`);
    }
  }

  /**
   * Remove account from entity
   */
  removeAccountFromEntity(entityId: string, accountId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const index = entity.accountIds.indexOf(accountId);
    if (index >= 0) {
      entity.accountIds.splice(index, 1);
      console.log(`[ENTITY_MANAGER] Removed account ${accountId} from entity ${entityId}`);
    }
  }

  /**
   * Get entity for an account
   */
  getEntityForAccount(accountId: string): Entity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.accountIds.includes(accountId)) {
        return entity;
      }
    }
    return undefined;
  }
}

