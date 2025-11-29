// scripts/prepare-test.ts
// Run this before testing to ensure test user exists
import { prisma } from '../db/prisma';
import bcrypt from 'bcryptjs';

async function prepareTestUser() {
  console.log('🔧 Preparing test environment...\n');

  try {
    // 1. Check if test user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@test.com' }
    });

    if (existingUser) {
      console.log('✅ Test user already exists');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Role: ${existingUser.role}\n`);
    } else {
      // 2. Create test user
      console.log('📝 Creating test user...');
      const hashedPassword = await bcrypt.hash('Test1234', 10);
      
      const newUser = await prisma.user.create({
        data: {
          email: 'test@test.com',
          name: 'Test User',
          password: hashedPassword,
          role: 'USER',
          emailVerified: new Date(),
        }
      });

      console.log('✅ Test user created');
      console.log(`   Email: ${newUser.email}`);
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Role: ${newUser.role}\n`);
    }

    // 3. Show test credentials
    console.log('🔑 Test Credentials:');
    console.log('   Email: test@test.com');
    console.log('   Password: Test1234\n');

    // 4. Create a test product (optional)
    const category = await prisma.category.upsert({
      where: { slug: 'test-category' },
      update: {},
      create: {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Category for testing',
      }
    });

    const product = await prisma.product.upsert({
      where: { slug: 'test-product' },
      update: { isActive: true, stock: 100 },
      create: {
        name: 'Test Product',
        slug: 'test-product',
        description: 'A product for testing',
        price: 99.99,
        stock: 100,
        isActive: true,
        categoryId: category.id,
        images: ['https://via.placeholder.com/400'],
      }
    });

    console.log('✅ Test product ready');
    console.log(`   Name: ${product.name}`);
    console.log(`   Slug: ${product.slug}`);
    console.log(`   Price: $${product.price}\n`);

    console.log('✅ Test environment ready!\n');
    console.log('🚀 You can now run: npm run test:minimal\n');

  } catch (error) {
    console.error('❌ Error preparing test environment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

prepareTestUser();