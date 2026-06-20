'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeckTag extends Model {
    static associate(models) {
      DeckTag.belongsTo(models.Deck, { foreignKey: 'deckId' });
      DeckTag.belongsTo(models.Tag, { foreignKey: 'tagId' });
    }
  }
  DeckTag.init({
    deckId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Decks', key: 'id' }
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Tags', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'DeckTag',
    tableName: 'DeckTags'
  });
  return DeckTag;
};
