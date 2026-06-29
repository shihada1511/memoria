'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DeckRequest extends Model {
    static associate(models) {
      DeckRequest.belongsTo(models.Deck, { foreignKey: 'deckId', as: 'deck' });
      DeckRequest.belongsTo(models.User, { foreignKey: 'requesterId', as: 'requester' });
    }
  }
  DeckRequest.init({
    deckId: { type: DataTypes.INTEGER, allowNull: false },
    requesterId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'accepted', 'rejected'), allowNull: false, defaultValue: 'pending' }
  }, { sequelize, modelName: 'DeckRequest', tableName: 'DeckRequests' });
  return DeckRequest;
};
