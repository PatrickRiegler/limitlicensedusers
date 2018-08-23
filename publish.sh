rm limitusers.zip 
cd limitusers
echo "zipping..."
zip -q -X -r ../limitusers.zip *
cd .. 
echo "uploading..."
aws lambda update-function-code --function-name LimitLicensedUsers --zip-file fileb://limitusers.zip --profile OR

echo
echo "----------------"


