/**
 * ToolConfiguration
 * Central registration point for all AI Assistant tools
 *
 * SOLID Principles:
 * - Open/Closed: Add new tools by registering them here
 * - Single Responsibility: Only responsible for tool registration
 *
 * This is where you register all available tools for the AI Assistant.
 * When you create a new tool, import it and register it here.
 */

import { ToolRegistry } from '../application/services/ToolRegistry';

// Import finance tools
import {
  CreateFinancialTransactionTool,
  GetFinancialCategoriesTool,
  GetFinancialFundsTool,
  GetFinancialSourcesTool,
  SearchFinancialTransactionsTool,
  GetFinancialTransactionDetailsTool,
  ManageFinancialTransactionTool,
} from '../infrastructure/tools/plugins/finance';

// Import member tools
import {
  CreateMemberTool,
  GetMemberDetailsTool,
  SearchMembersTool,
  GetMemberBirthdaysTool,
  GetMemberAnniversariesTool,
} from '../infrastructure/tools/plugins/members';

// Import family tools
import {
  SearchFamiliesTool,
  GetFamilyDetailsTool,
  ManageFamilyMembersTool,
} from '../infrastructure/tools/plugins/families';

// Import care plan tools
import {
  SearchCarePlansTool,
  GetCarePlanDetailsTool,
  ManageCarePlanTool,
} from '../infrastructure/tools/plugins/careplans';

// Import discipleship plan tools
import {
  SearchDiscipleshipPlansTool,
  GetDiscipleshipPlanDetailsTool,
  ManageDiscipleshipPlanTool,
} from '../infrastructure/tools/plugins/discipleshipplans';

// Import account tools
import {
  SearchAccountsTool,
  GetAccountDetailsTool,
  ManageAccountTool,
} from '../infrastructure/tools/plugins/accounts';

/**
 * Configure and register all tools for the AI Assistant
 *
 * @returns Configured ToolRegistry with all tools registered
 */
export async function configureTools(): Promise<ToolRegistry> {
  const registry = new ToolRegistry();

  console.log('🔧 Configuring AI Assistant tools...');

  // ============================================================================
  // TOOL REGISTRATION
  // ============================================================================
  //
  // To add a new tool:
  // 1. Import your tool class
  // 2. Instantiate it with required dependencies (if needed)
  // 3. Register it with registry.register(toolInstance)
  //
  // ============================================================================

  // ============================================================================
  // FINANCE TOOLS
  // ============================================================================
  console.log('📊 Registering finance tools...');

  // Lookup tools (no dependencies required)
  registry.register(new GetFinancialCategoriesTool());
  registry.register(new GetFinancialFundsTool());
  registry.register(new GetFinancialSourcesTool());

  // Transaction tools (using GraphQL)
  registry.register(new SearchFinancialTransactionsTool());
  registry.register(new GetFinancialTransactionDetailsTool());
  registry.register(new CreateFinancialTransactionTool());
  registry.register(new ManageFinancialTransactionTool());

  // ============================================================================
  // MEMBER TOOLS
  // ============================================================================
  console.log('👥 Registering member tools...');

  // Member creation and information tools (no dependencies required)
  registry.register(new CreateMemberTool());
  registry.register(new GetMemberDetailsTool());
  registry.register(new SearchMembersTool());
  registry.register(new GetMemberBirthdaysTool());
  registry.register(new GetMemberAnniversariesTool());

  // ============================================================================
  // FAMILY TOOLS
  // ============================================================================
  console.log('👨‍👩‍👧‍👦 Registering family tools...');

  // Family information and management tools (no dependencies required)
  registry.register(new SearchFamiliesTool());
  registry.register(new GetFamilyDetailsTool());
  registry.register(new ManageFamilyMembersTool());

  // ============================================================================
  // CARE PLAN TOOLS
  // ============================================================================
  console.log('💙 Registering care plan tools...');

  // Care plan information and management tools (no dependencies required)
  registry.register(new SearchCarePlansTool());
  registry.register(new GetCarePlanDetailsTool());
  registry.register(new ManageCarePlanTool());

  // ============================================================================
  // DISCIPLESHIP PLAN TOOLS
  // ============================================================================
  console.log('✝️ Registering discipleship plan tools...');

  // Discipleship plan information and management tools (no dependencies required)
  registry.register(new SearchDiscipleshipPlansTool());
  registry.register(new GetDiscipleshipPlanDetailsTool());
  registry.register(new ManageDiscipleshipPlanTool());

  // ============================================================================
  // ACCOUNT TOOLS
  // ============================================================================
  console.log('💼 Registering account tools...');

  // Account information and management tools (no dependencies required)
  registry.register(new SearchAccountsTool());
  registry.register(new GetAccountDetailsTool());
  registry.register(new ManageAccountTool());

  // ============================================================================
  // TODO: Add more tool categories here
  // ============================================================================
  // - Donation Tools
  // - Event Tools
  // - Communication Tools
  // ============================================================================

  console.log(`✅ Configured ${registry.count()} tools`);
  registry.printTools();

  return registry;
}

/**
 * Get list of available tools (metadata only, no instantiation)
 * Useful for API endpoints that need to list available tools
 */
export function getAvailableToolMetadata(): Array<{
  name: string;
  category: string;
  displayName: string;
  description: string;
  samplePrompts: string[];
}> {
  // TODO: Add tool metadata as you register tools
  return [];
}
