const middy = require('@middy/core')
const ssm = require('@middy/ssm')
const { DynamoDB } = require("@aws-sdk/client-dynamodb")
const { unmarshall } = require("@aws-sdk/util-dynamodb")
const dynamodb = new DynamoDB()

const middyCacheEnabled = JSON.parse(process.env.middy_cache_enabled)
const middyCacheExpiry = parseInt(process.env.middy_cache_expiry_milliseconds)

const { serviceName, ssmStage } = process.env
const tableName = process.env.restaurants_table

const getRestaurants = async (count) => {
    console.log(`fetching ${count} restaurants from ${tableName}...`)
    const req = {
        TableName: tableName,
        Limit: count
    }

    const resp = await dynamodb.scan(req)
    console.log(`found ${resp.Items.length} restaurants`)
    return resp.Items.map(x => unmarshall(x))
}

module.exports.handler = middy(async (event, context) => {
    const restaurants = await getRestaurants(context.config.defaultResults)
    const response = {
        statusCode: 200,
        body: JSON.stringify(restaurants)
    }

    return response
}).use(ssm({
    cache: middyCacheEnabled,
    cacheExpiry: middyCacheExpiry,
    setToContext: true,
    fetchData: {
        config: `/${serviceName}/${ssmStage}/get-restaurants/config`
    }
}))