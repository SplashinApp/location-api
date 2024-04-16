import pino from 'pino'
import dotenv from 'dotenv'
dotenv.config({path:`.env.${process.env.NODE_ENV}`})

let transport
if(
    process.env.NODE_ENV !== 'development'
){
    transport = pino.transport({
        targets:[
            {
                target: '@logtail/pino',
                options: {sourceToken: process.env.LOGTAIL_SOURCE_TOKEN }
            }
        ]
    })
}
const logger = pino.pino(transport)

export default logger
