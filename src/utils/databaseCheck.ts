import { supabase } from '../lib/supabaseClient';

// Database setup checker
export const checkDatabaseSetup = async () => {
  console.log('🔍 Checking database setup...');
  
  const checks = {
    connection: false,
    productsTable: false,
    usersTable: false,
    cartItemsTable: false,
    sampleProducts: false
  };

  try {
    // Test 1: Basic connection with timeout
    const connectionPromise = supabase
      .from('products')
      .select('count');
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    const { data: connectionTest, error: connectionError } = await Promise.race([
      connectionPromise,
      timeoutPromise
    ]) as any;
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return checks;
    }
    
    checks.connection = true;
    console.log('✅ Database connection successful');

    // Test 2: Products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');
    
    if (productsError) {
      console.error('❌ Products table error:', productsError);
    } else {
      checks.productsTable = true;
      console.log('✅ Products table accessible');
      console.log(`📦 Found ${products?.length || 0} products`);
      checks.sampleProducts = (products?.length || 0) > 0;
    }

    // Test 3: Users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count');
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
    } else {
      checks.usersTable = true;
      console.log('✅ Users table accessible');
    }

    // Test 4: Cart items table
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('count');
    
    if (cartError) {
      console.error('❌ Cart items table error:', cartError);
    } else {
      checks.cartItemsTable = true;
      console.log('✅ Cart items table accessible');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }

  // Summary
  console.log('\n📊 Database Setup Summary:');
  console.log(`Connection: ${checks.connection ? '✅' : '❌'}`);
  console.log(`Products Table: ${checks.productsTable ? '✅' : '❌'}`);
  console.log(`Users Table: ${checks.usersTable ? '✅' : '❌'}`);
  console.log(`Cart Items Table: ${checks.cartItemsTable ? '✅' : '❌'}`);
  console.log(`Sample Products: ${checks.sampleProducts ? '✅' : '❌'}`);

  if (!checks.connection) {
    console.log('\n🚨 CRITICAL: Database connection failed. Please check your Supabase configuration.');
  } else if (!checks.productsTable || !checks.usersTable || !checks.cartItemsTable) {
    console.log('\n🚨 CRITICAL: Database tables are missing. Please run the SQL schema script in your Supabase dashboard.');
  } else if (!checks.sampleProducts) {
    console.log('\n⚠️  WARNING: No sample products found. The app will create them automatically.');
  } else {
    console.log('\n🎉 All database checks passed!');
  }

  return checks;
};

// Make it available globally for debugging
(window as any).checkDatabaseSetup = checkDatabaseSetup;
