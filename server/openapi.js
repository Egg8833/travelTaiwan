const scenicSpotSchema = {
  type: 'object',
  properties: {
    ScenicSpotID: {type: 'string', example: 'VCA_315080500H_000015'},
    ScenicSpotName: {type: 'string', example: '國立故宮博物院'},
    DescriptionDetail: {type: 'string'},
    Phone: {type: 'string'},
    Address: {type: 'string'},
    OpenTime: {type: 'string'},
    ZipCode: {type: 'string'},
    City: {type: 'string', example: '臺北市'},
    Picture: {
      type: 'object',
      properties: {
        PictureUrl1: {type: 'string'},
        PictureDescription1: {type: 'string'},
      },
    },
    Position: {
      type: 'object',
      properties: {
        PositionLon: {type: 'number'},
        PositionLat: {type: 'number'},
        GeoHash: {type: 'string'},
      },
    },
    Class1: {type: 'string', example: '文化類'},
    Class2: {type: 'string'},
    Class3: {type: 'string'},
    SrcUpdateTime: {type: 'string', format: 'date-time'},
    UpdateTime: {type: 'string', format: 'date-time'},
  },
}

const errorSchema = {
  type: 'object',
  properties: {
    message: {type: 'string', example: 'city is required'},
  },
}

const scenicSpotArray = {
  'application/json': {
    schema: {type: 'array', items: {$ref: '#/components/schemas/ScenicSpot'}},
  },
}

export default {
  openapi: '3.0.3',
  info: {
    title: 'travelTaiwan API',
    version: '1.0.0',
    description:
      '台灣景點資料唯讀 API。資料來源為專案內建 JSON（原 TDX 觀光資料格式），僅提供查詢，無寫入操作。',
  },
  servers: [{url: '/', description: '目前主機'}],
  tags: [
    {name: 'ScenicSpot', description: '景點查詢'},
    {name: 'Misc', description: '其他資料'},
  ],
  paths: {
    '/api/scenic-spots': {
      get: {
        tags: ['ScenicSpot'],
        summary: '依城市查詢景點',
        parameters: [
          {
            name: 'city',
            in: 'query',
            required: true,
            description: '城市英文名（見 /api/cities 的 City 欄位）',
            schema: {type: 'string', example: 'Taipei'},
          },
          {
            name: 'top',
            in: 'query',
            required: false,
            description: '回傳筆數上限，預設 30',
            schema: {type: 'integer', default: 30},
          },
        ],
        responses: {
          200: {description: '景點陣列', content: scenicSpotArray},
          400: {
            description: '缺少 city 或城市名稱不存在',
            content: {
              'application/json': {
                schema: {$ref: '#/components/schemas/Error'},
              },
            },
          },
        },
      },
    },
    '/api/scenic-spots/search': {
      get: {
        tags: ['ScenicSpot'],
        summary: '依名稱關鍵字搜尋景點',
        parameters: [
          {
            name: 'keyword',
            in: 'query',
            required: true,
            description: '景點名稱關鍵字（子字串比對）',
            schema: {type: 'string', example: '沙灘'},
          },
        ],
        responses: {
          200: {description: '符合的景點陣列', content: scenicSpotArray},
          400: {
            description: '缺少 keyword',
            content: {
              'application/json': {
                schema: {$ref: '#/components/schemas/Error'},
              },
            },
          },
        },
      },
    },
    '/api/scenic-spots/random': {
      get: {
        tags: ['ScenicSpot'],
        summary: '隨機推薦景點（僅含有圖片的景點）',
        parameters: [
          {
            name: 'count',
            in: 'query',
            required: false,
            description: '抽取筆數，預設 3',
            schema: {type: 'integer', default: 3},
          },
        ],
        responses: {
          200: {description: '隨機景點陣列', content: scenicSpotArray},
        },
      },
    },
    '/api/scenic-spots/{id}': {
      get: {
        tags: ['ScenicSpot'],
        summary: '依 ScenicSpotID 取得單筆景點',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {type: 'string', example: 'VCA_315080500H_000015'},
          },
        ],
        responses: {
          200: {
            description: '單筆景點',
            content: {
              'application/json': {
                schema: {$ref: '#/components/schemas/ScenicSpot'},
              },
            },
          },
          404: {
            description: '查無此 ID',
            content: {
              'application/json': {
                schema: {$ref: '#/components/schemas/Error'},
              },
            },
          },
        },
      },
    },
    '/api/home-views': {
      get: {
        tags: ['Misc'],
        summary: '首頁區域熱門景點資料（6 個區域）',
        responses: {
          200: {
            description:
              '陣列，每個元素為以區域名稱（北部地區、中部地區…）為 key 的物件，值為該區域景點陣列',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                      items: {$ref: '#/components/schemas/ScenicSpot'},
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/cities': {
      get: {
        tags: ['Misc'],
        summary: '城市清單（中英文對照）',
        responses: {
          200: {
            description: '城市陣列',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      CityID: {type: 'string', example: 'A'},
                      CityName: {type: 'string', example: '臺北市'},
                      CityCode: {type: 'string', example: 'TPE'},
                      City: {type: 'string', example: 'Taipei'},
                      CountyID: {type: 'string', example: 'A'},
                      Version: {type: 'string', example: '23.09.1'},
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ScenicSpot: scenicSpotSchema,
      Error: errorSchema,
    },
  },
}
