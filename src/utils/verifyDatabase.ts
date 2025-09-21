import { supabase } from '../lib/supabaseClient';

export const verifyDatabaseSetup = async () => {
  console.log('🔍 Verifying database setup...');
  
  const results = {
    connection: false,
    usersTable: false,
    productsTable: false,
    cartItemsTable: false,
    usersTableStructure: null as any,
    error: null as string | null
  };

  try {
    // Test 1: Basic connection
    console.log('1. Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      results.error = `Connection failed: ${connectionError.message}`;
      console.error('❌ Connection failed:', connectionError);
      return results;
    }
    
    results.connection = true;
    console.log('✅ Database connection successful');

    // Test 2: Check users table structure
    console.log('2. Checking users table structure...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      if (usersError.message.includes('relation') || usersError.message.includes('does not exist')) {
        results.error = 'Users table does not exist';
        console.error('❌ Users table does not exist');
      } else {
        results.error = `Users table error: ${usersError.message}`;
        console.error('❌ Users table error:', usersError);
      }
      return results;
    }

    results.usersTable = true;
    console.log('✅ Users table exists');

    // Test 3: Check if full_name column exists by trying to select it
    console.log('3. Checking if full_name column exists...');
    const { data: nameTest, error: nameError } = await supabase
      .from('users')
      .select('full_name')
      .limit(1);

    if (nameError) {
      results.error = `Full name column missing: ${nameError.message}`;
      console.error('❌ Full name column missing:', nameError);
      return results;
    }

    console.log('✅ Full name column exists');

    // Test 4: Check products table
    console.log('4. Checking products table...');
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('count')
      .limit(1);

    if (productsError) {
      results.error = `Products table error: ${productsError.message}`;
      console.error('❌ Products table error:', productsError);
      return results;
    }

    results.productsTable = true;
    console.log('✅ Products table exists');

    // Test 5: Check cart_items table
    console.log('5. Checking cart_items table...');
    const { data: cartData, error: cartError } = await supabase
      .from('cart_items')
      .select('count')
      .limit(1);

    if (cartError) {
      results.error = `Cart items table error: ${cartError.message}`;
      console.error('❌ Cart items table error:', cartError);
      return results;
    }

    results.cartItemsTable = true;
    console.log('✅ Cart items table exists');

    console.log('🎉 All database checks passed!');
    return results;

  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Verification failed:', error);
    return results;
  }
};

// Make it available globally for debugging
(window as any).verifyDatabaseSetup = verifyDatabaseSetup;
