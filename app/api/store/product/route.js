import authSeller from "@/middlewares/authSeller";
import { getAuth} from "@clerk/nextjs/server";
import { transform } from "next/dist/build/swc/generated-native";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import ImageKit from "imagekit";    
import imagekit from "@/configs/imageKit";

// Add a new product
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId);

        if(!storeId){
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
        }   

        //Get the data from the form
        const formData = await request.formData();
        const name = formData.get("name");
        const description = formData.get("description");
        const mrp = Number(formData.get("mrp"));
        const price = Number(formData.get("price"));
        const category = formData.get("category");
        const image = formData.get("image");

        if(!name || !description || !mrp || !price || !category || !image.length < 1){
            return NextResponse.json({error: "Missing product info"}, {status: 400});
        }

        //Uploading images to imageKit
        const imageUrls = await Promise.all(image.map(async(img)=>{
            const buffer = Buffer.from(await img.arrayBuffer());
            const response = await imagekit.upload({
                file: buffer,
                fileName: img.name,
                folder:"products"
            })
            const url = imagekit.url({
                path: response.filePath,
                transformation:[
                    {quality: 'auto'},
                    {format: 'webp'},
                    {width: '1024'}]
            })
            return url;
        }))
        await prisma.product.create({
            data:{
                name,
                description,
                mrp,
                price,
                category,
                images: imageUrls,
                storeId
            }
        })
        return NextResponse.json({message: "Product added successfully"});
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    }
}


// Get all products for the seller
export async function GET(request) {
    try {
         const { userId } = getAuth(request)
        const storeId = await authSeller(userId);

        if(!storeId){
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
        }   
        const products = await prisma.product.findMany({
            where: {storeId}
        })
        return NextResponse.json({products})
        
    } catch (error) {
         console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status: 400})
        
    }
}