import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default expense categories
  const categories = [
    { name: 'Transporte/Flete', nameEn: 'Transport/Freight', isDefault: true },
    { name: 'Almacenamiento', nameEn: 'Storage', isDefault: true },
    { name: 'Mano de obra', nameEn: 'Labor', isDefault: true },
    { name: 'Empaque', nameEn: 'Packaging', isDefault: true },
    { name: 'Combustible', nameEn: 'Fuel', isDefault: true },
    { name: 'Mantenimiento', nameEn: 'Maintenance', isDefault: true },
    { name: 'Otros', nameEn: 'Others', isDefault: true },
  ];

  console.log('📦 Creating default expense categories...');
  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: { id: category.name }, // Use name as temporary unique identifier
      update: {},
      create: category,
    });
  }

  // Create demo admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  console.log('👤 Creating demo admin user...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@controldecompra.com' },
    update: {},
    create: {
      email: 'admin@controldecompra.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      language: 'es',
      theme: 'light',
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📧 Demo credentials:');
  console.log('   Email: admin@controldecompra.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
