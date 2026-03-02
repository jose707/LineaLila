'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rides', 'counterOffers', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de contraofertas enviadas por conductores',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('rides', 'counterOffers');
  },
};
