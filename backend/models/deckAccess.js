'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DeckAccess extends Model {
    static associate(models) {
      DeckAccess.belongsTo(models.Deck, { foreignKey: 'deckId', as: 'deck' });
      DeckAccess.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  DeckAccess.init({
    deckId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false }
  }, { sequelize, modelName: 'DeckAccess', tableName: 'DeckAccess' });
  return DeckAccess;
};
