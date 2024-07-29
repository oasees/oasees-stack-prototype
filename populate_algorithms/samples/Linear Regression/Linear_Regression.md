
# Simple Linear Regression

## Introduction

Simple Linear Regression is a statistical method that allows us to summarize and study relationships between two continuous (quantitative) variables:
- One variable, denoted $$X$$, is regarded as the predictor, explanatory, or independent variable.
- The other variable, denoted $$Y$$, is regarded as the response, outcome, or dependent variable.

The goal of Simple Linear Regression is to find the best-fitting straight line through the points. This line is known as the **regression line** and is represented by the equation:

$$Y = \beta_0 + \beta_1X + \epsilon$$

where:
- $$ \beta_0 $$ is the intercept (the value of $$Y$$ when $$X = 0$$).
- $$ \beta_1 $$ is the slope (the change in $$Y$$ for a one-unit change in $$X$$).
- $$ \epsilon $$ is the error term (the difference between the observed and predicted values of $$Y$$).

## Steps to Perform Simple Linear Regression

1. **Data Collection**: Collect data for the two variables of interest.
2. **Exploratory Data Analysis (EDA)**: Visualize the data using scatter plots and compute summary statistics.
3. **Fit the Model**: Use statistical software or mathematical methods to estimate the parameters $$ \beta_0 $$ and $$ \beta_1 $$.
4. **Make Predictions**: Use the fitted model to make predictions.
5. **Evaluate the Model**: Assess the model's performance using metrics like R-squared, Mean Squared Error (MSE), etc.

## Example

Let's go through an example to illustrate the steps involved in performing Simple Linear Regression.

### Step 1: Data Collection

Assume we have the following data:

| Hours Studied (X) | Exam Score (Y) |
|-------------------|----------------|
| 1                 | 50             |
| 2                 | 55             |
| 3                 | 65             |
| 4                 | 70             |
| 5                 | 75             |

### Step 2: Exploratory Data Analysis

Plot the data:

![Scatter Plot](scatter_plot.png)

### Step 3: Fit the Model

We use the least squares method to fit the linear regression model. The formulas for the estimates of the intercept and slope are:

$$ \hat{\beta}_1 = \frac{\sum_{i=1}^{n}(X_i - \bar{X})(Y_i - \bar{Y})}{\sum_{i=1}^{n}(X_i - \bar{X})^2} $$

$$ \hat{\beta}_0 = \bar{Y} - \hat{\beta}_1\bar{X} $$

Where:
- $$ \hat{\beta}_1 $$ is the estimated slope.
- $$ \hat{\beta}_0 $$ is the estimated intercept.
- $$ \bar{X} $$ is the mean of $$X$$.
- $$ \bar{Y} $$ is the mean of $$Y$$.

### Step 4: Make Predictions

Using the fitted model, we can predict the exam score for a given number of hours studied. For example, if a student studies for 3.5 hours:

$$ Y = \hat{\beta}_0 + \hat{\beta}_1(3.5) $$

### Step 5: Evaluate the Model

We can evaluate the model using R-squared, which indicates the proportion of the variance in the dependent variable that is predictable from the independent variable:

$$ R^2 = 1 - \frac{\sum_{i=1}^{n}(Y_i - \hat{Y_i})^2}{\sum_{i=1}^{n}(Y_i - \bar{Y})^2} $$

## Conclusion

Simple Linear Regression is a foundational technique in statistical modeling and machine learning. It provides a straightforward method for understanding relationships between variables and making predictions.

## References

- [Linear Regression - Wikipedia](https://en.wikipedia.org/wiki/Linear_regression)
- [Introduction to Linear Regression](https://www.statisticssolutions.com/free-resources/directory-of-statistical-analyses/intro-to-linear-regression/)
